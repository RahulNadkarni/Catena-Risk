"use server";

import { randomUUID } from "node:crypto";
import { createCatenaClientFromEnv } from "@/lib/catena/client";
import { getCachedFleetDossier } from "@/lib/cache/dossier-cache";
import { computeBehaviorRates, computeExposureMetrics } from "@/lib/domain/derived-metrics";
import type { FleetDossier } from "@/lib/domain/fleet-dossier";
import { buildFleetDossier } from "@/lib/domain/fleet-dossier";
import {
  getSubmission as getSubmissionRow,
  insertSubmission,
  listRecentSubmissions,
  type ApiTraceEntry,
  type ProspectPayload,
} from "@/lib/db/submissions";
import { computePeerBenchmarks } from "@/lib/risk/peer-benchmarks";
import { computeRiskScore, type RiskScore } from "@/lib/risk/scoring";
import { getFixtureFleetSummary, listHeroFleetIds } from "@/lib/underwriting/hero-fleets";
import {
  REQUESTED_PERMISSIONS,
  type ConsentResult,
  type DossierSummary,
  type FleetPreview,
} from "@/lib/underwriting/consent-permissions";

function nowIso() {
  return new Date().toISOString();
}

async function timed<T>(
  label: string,
  path: string,
  method: string,
  fn: () => Promise<T>,
  trace: ApiTraceEntry[],
): Promise<T> {
  const t0 = Date.now();
  try {
    const r = await fn();
    const ms = Date.now() - t0;
    trace.push({
      path,
      method,
      ms,
      status: 200,
      at: nowIso(),
      label,
    });
    return r;
  } catch (e) {
    const ms = Date.now() - t0;
    trace.push({
      path,
      method,
      ms,
      status: 0,
      at: nowIso(),
      label: `${label}:error`,
    });
    throw e;
  }
}

/** Serialise a FastAPI-style error detail (string | validation-error array | object)
 *  into something a human can read in the UI. */
function formatErrorDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          const loc = Array.isArray(o.loc) ? o.loc.filter((p) => p !== "body").join(".") : null;
          const msg = typeof o.msg === "string" ? o.msg : null;
          if (loc && msg) return `${loc}: ${msg}`;
          if (msg) return msg;
          return JSON.stringify(item);
        }
        return String(item);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return String(detail);
}

function describeError(e: unknown): string {
  if (e && typeof e === "object" && "response" in e) {
    const r = (e as { response?: { status?: number; data?: unknown } }).response;
    if (r?.status) {
      let detail = "";
      if (r.data && typeof r.data === "object") {
        const d = r.data as Record<string, unknown>;
        if ("detail" in d) detail = formatErrorDetail(d.detail);
        else if ("message" in d && typeof d.message === "string") detail = d.message;
        else detail = JSON.stringify(d);
      } else if (typeof r.data === "string") {
        detail = r.data;
      }
      return `HTTP ${r.status}${detail ? ` — ${detail}` : ""}`;
    }
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

function parseFleetDetail(raw: unknown): FleetPreview["fleet"] {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return {
    id: typeof o.id === "string" ? o.id : "",
    name: str(o.name),
    legalName: str(o.legal_name),
    dbaName: str(o.dba_name),
    fleetRef: str(o.fleet_ref),
    regulatoryId: str(o.regulatory_id),
    regulatoryIdType: str(o.regulatory_id_type),
    websites: arr(o.websites),
    address: str(o.address),
    city: str(o.city),
    province: str(o.province),
    countryCode: str(o.country_code),
    createdAt: str(o.created_at),
  };
}

function parseAnalyticsCounts(raw: unknown): FleetPreview["analytics"] {
  const out: FleetPreview["analytics"] = {
    vehicleCount: null,
    driverCount: null,
    trailerCount: null,
    source: null,
    raw: null,
  };
  if (!raw || typeof raw !== "object") return out;
  const o = raw as Record<string, unknown>;
  out.raw = o;
  const num = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim().length > 0) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };
  const pickFirst = (keys: string[]): number | null => {
    for (const k of keys) {
      if (k in o) {
        const n = num(o[k]);
        if (n !== null) return n;
      }
    }
    return null;
  };
  // Shape varies by TSP; grab the most common aliases.
  out.vehicleCount = pickFirst([
    "total_vehicles",
    "vehicle_count",
    "vehicles_total",
    "num_vehicles",
  ]);
  out.driverCount = pickFirst([
    "total_drivers",
    "driver_count",
    "drivers_total",
    "total_users",
    "user_count",
  ]);
  out.trailerCount = pickFirst([
    "total_trailers",
    "trailer_count",
    "trailers_total",
  ]);
  if (out.vehicleCount != null || out.driverCount != null || out.trailerCount != null) {
    out.source = "api";
  }
  return out;
}

function parsePermissionsDict(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export async function getFleetPreview(fleetId: string): Promise<FleetPreview> {
  const client = createCatenaClientFromEnv();
  const errors: string[] = [];

  const [fleetRaw, connectionsRaw, analyticsRaw, sharePageRaw, fixtureSummary] = await Promise.all([
    client.getFleet(fleetId).catch((e) => {
      errors.push(`getFleet: ${describeError(e)}`);
      return null;
    }),
    client.listConnections({ size: 50 }).catch((e) => {
      errors.push(`listConnections: ${describeError(e)}`);
      return null;
    }),
    client
      .getAnalyticsOverview({ fleet_ids: [fleetId] })
      .catch((e) => {
        errors.push(`getAnalyticsOverview: ${describeError(e)}`);
        return null;
      }),
    client.listShareAgreements({ size: 50 }).catch((e) => {
      errors.push(`listShareAgreements: ${describeError(e)}`);
      return null;
    }),
    getFixtureFleetSummary(fleetId).catch(() => null),
  ]);

  const connections = (connectionsRaw?.items ?? [])
    .filter((c) => {
      const o = c as { fleet_id?: string };
      return o.fleet_id === fleetId;
    })
    .map((c) => {
      const o = c as {
        id: string;
        source_name: string;
        status: string;
        updated_at: string;
      };
      return {
        id: o.id,
        sourceName: o.source_name,
        status: o.status,
        updatedAt: o.updated_at,
      };
    });

  const shareAgreements = (sharePageRaw?.items ?? [])
    .filter((s) => {
      const o = s as { fleet_id?: string };
      return o.fleet_id === fleetId;
    })
    .map((s) => {
      const o = s as Record<string, unknown>;
      return {
        id: typeof o.id === "string" ? o.id : "",
        status: typeof o.status === "string" ? o.status : "unknown",
        createdAt: typeof o.created_at === "string" ? o.created_at : null,
        updatedAt: typeof o.updated_at === "string" ? o.updated_at : null,
        permissions: parsePermissionsDict(o.permissions),
      };
    });

  const analytics = parseAnalyticsCounts(analyticsRaw);
  // Fixture numbers are pre-built for the hero fleets and more reliable than
  // `GET /analytics/overview` on the sandbox. Fall through to the API only for
  // fields the fixture doesn't cover, or for non-hero fleets.
  if (fixtureSummary) {
    if (analytics.vehicleCount == null && fixtureSummary.counts.vehicles > 0) {
      analytics.vehicleCount = fixtureSummary.counts.vehicles;
      analytics.source = "fixture";
    }
    if (analytics.driverCount == null && fixtureSummary.counts.users > 0) {
      analytics.driverCount = fixtureSummary.counts.users;
      analytics.source = analytics.source ?? "fixture";
    }
  }

  const fixture: FleetPreview["fixture"] = fixtureSummary
    ? {
        rank: fixtureSummary.rank,
        score: fixtureSummary.score,
        safetyEventCount: fixtureSummary.counts.safety,
        hosEventCount: fixtureSummary.counts.hosEvents,
        dvirLogCount: fixtureSummary.counts.dvirLogs,
        locationCount: fixtureSummary.counts.locations,
        firstSeenAt: fixtureSummary.firstSeenAt,
        telematicsSources: fixtureSummary.telematicsSources,
      }
    : null;

  return {
    fleetId,
    fleet: parseFleetDetail(fleetRaw),
    connections,
    analytics,
    fixture,
    shareAgreements,
    errors,
  };
}

export async function sendConsentInvitation(input: {
  fleetId: string;
  prospect: ProspectPayload;
}): Promise<ConsentResult> {
  const trace: ApiTraceEntry[] = [];
  const client = createCatenaClientFromEnv();
  let simulated = false;
  let consentError: string | null = null;
  let invitation: ConsentResult["invitation"] = null;
  let activatedAgreement: ConsentResult["activatedAgreement"] = null;

  try {
    const inviteResp = await timed(
      "createInvitation",
      "/v2/orgs/invitations",
      "POST",
      () =>
        // Per the Catena spec, POST /v2/orgs/invitations creates a magic link
        // for a NEW fleet to onboard — `fleet_id` is not an input; it's
        // populated on the response after the fleet accepts. For this
        // underwriting workflow we're requesting read-only consent on an
        // existing sandbox fleet, so we pass our internal reference as
        // fleet_ref (the partner-side identifier for mapping) and the
        // minimum read permissions we need for the dossier pull.
        client.createInvitation({
          fleet_ref: `UW-${input.fleetId.slice(0, 8)}`,
          fleet_name: input.prospect.legalName ?? null,
          fleet_regulatory_id: input.prospect.dotNumber ?? null,
          fleet_regulatory_id_type: input.prospect.dotNumber ? "DOT" : null,
          partner_slug: process.env.CATENA_PARTNER_SLUG ?? "catena-candidates",
          expires_in_hours: 24,
          permissions: REQUESTED_PERMISSIONS,
        }),
      trace,
    );
    if (inviteResp && typeof inviteResp === "object") {
      const o = inviteResp as Record<string, unknown>;
      invitation = {
        id: typeof o.id === "string" ? o.id : null,
        magicLink: typeof o.magic_link === "string" ? o.magic_link : null,
        expiresAt: typeof o.expires_at === "string" ? o.expires_at : null,
        status: typeof o.status === "string" ? o.status : null,
        partnerSlug: typeof o.partner_slug === "string" ? o.partner_slug : null,
      };
    }
  } catch (e) {
    simulated = true;
    consentError = `POST /v2/orgs/invitations: ${describeError(e)}`;
    trace.push({
      path: "/v2/orgs/invitations",
      method: "POST",
      ms: 0,
      status: 0,
      at: nowIso(),
      label: "createInvitation:failed",
      errorDetail: consentError,
    });
  }

  try {
    const sharePage = await timed(
      "listShareAgreements",
      "/v2/orgs/share_agreements",
      "GET",
      () => client.listShareAgreements({ size: 50 }),
      trace,
    );
    const first = sharePage.items.find((s) => {
      const o = s as { fleet_id?: string; status?: string };
      return (
        o.fleet_id === input.fleetId &&
        (o.status === "pending" || o.status === "paused" || o.status === "draft")
      );
    });
    if (first?.id) {
      await timed(
        "activateShareAgreement",
        `/v2/orgs/share_agreements/${first.id}`,
        "PATCH",
        () => client.activateShareAgreement(first.id),
        trace,
      );
      activatedAgreement = { id: first.id, status: "active" };
    }
  } catch (e) {
    simulated = true;
    const msg = `activateShareAgreement: ${describeError(e)}`;
    consentError = consentError ? `${consentError}; ${msg}` : msg;
    trace.push({
      path: "/v2/orgs/share_agreements",
      method: "PATCH",
      ms: 0,
      status: 0,
      at: nowIso(),
      label: "activateShareAgreement:failed",
      errorDetail: msg,
    });
  }

  return {
    ok: !simulated,
    simulated,
    trace,
    consentError,
    invitation,
    activatedAgreement,
    requestedPermissions: REQUESTED_PERMISSIONS,
  };
}

export async function createSubmission(input: {
  fleetId: string;
  prospect: ProspectPayload;
  consentTrace?: ApiTraceEntry[];
  consentSimulated?: boolean;
}): Promise<{
  submissionId: string;
  endpointTimings: Record<string, number>;
  summary: DossierSummary;
}> {
  const client = createCatenaClientFromEnv();
  const heroIds = await listHeroFleetIds();
  const fixtureDossiers = await Promise.all(
    heroIds.map((id) => buildFleetDossier(id, { source: "fixtures" })),
  );

  // Sandbox rejects `listHosViolations` / other time-windowed endpoints with
  // 400 on 90-day windows and sizes > 100 — use the smaller window + page
  // size that matches the API's documented maxima.
  const targetDossier = await getCachedFleetDossier(input.fleetId, {
    source: "api",
    windowDays: 30,
    pagination: { maxPages: 1, pageSize: 100 },
    client,
  });

  const hasTargetInHero = fixtureDossiers.some((d) => d.fleetId === input.fleetId);
  const merged: FleetDossier[] = hasTargetInHero
    ? fixtureDossiers.map((d) => (d.fleetId === input.fleetId ? targetDossier : d))
    : [...fixtureDossiers, targetDossier];
  const peerBenchmarks = computePeerBenchmarks(merged);

  const exposure = computeExposureMetrics(targetDossier);
  const behaviorRates = computeBehaviorRates(targetDossier, exposure);
  const score = computeRiskScore({
    behaviorRates,
    exposure,
    peerBenchmarks,
    dossier: targetDossier,
  });

  const submissionId = randomUUID();
  const metaTrace: ApiTraceEntry[] = Object.entries(targetDossier.meta.endpointTimings).map(([path, ms]) => ({
    path,
    method: "GET",
    ms,
    status: 200,
    at: nowIso(),
    label: "dossier",
  }));

  const apiTrace = [...(input.consentTrace ?? []), ...metaTrace];

  insertSubmission({
    id: submissionId,
    fleetId: input.fleetId,
    prospect: input.prospect,
    dossier: targetDossier,
    score,
    peerBenchmarks,
    apiTrace,
    consentSimulated: Boolean(input.consentSimulated),
  });

  const summary: DossierSummary = {
    vehicleCount: targetDossier.vehicles.length,
    driverCount: targetDossier.users.length,
    safetyEventCount: targetDossier.safetyEvents.length,
    hosEventCount: targetDossier.hosEvents.length,
    hosViolationCount: targetDossier.hosViolations.length,
    dvirLogCount: targetDossier.dvirLogs.length,
    dvirDefectCount: targetDossier.dvirDefects.length,
    engineLogCount: targetDossier.engineLogs.length,
    vehicleLocationCount: targetDossier.vehicleLocations.length,
    connectionCount: targetDossier.connections.length,
    windowStart: targetDossier.window.start,
    windowEnd: targetDossier.window.end,
    windowDays: targetDossier.meta.windowDays,
    totalApiCalls: targetDossier.meta.totalApiCalls,
    totalLatencyMs: targetDossier.meta.totalLatencyMs,
    dataGaps: targetDossier.dataGaps,
    riskScoreValue: score.compositeScore,
    riskScoreBand: score.tier,
  };

  return { submissionId, endpointTimings: targetDossier.meta.endpointTimings, summary };
}

export async function getSubmissionAction(id: string) {
  const row = getSubmissionRow(id);
  if (!row) return null;
  return {
    id: row.id,
    fleet_id: row.fleet_id,
    created_at: row.created_at,
    prospect: JSON.parse(row.prospect_json) as ProspectPayload,
    dossier: JSON.parse(row.dossier_json) as FleetDossier,
    score: JSON.parse(row.score_json) as RiskScore,
    peerBenchmarks: JSON.parse(row.peer_benchmarks_json),
    apiTrace: JSON.parse(row.api_trace_json) as ApiTraceEntry[],
    consentSimulated: row.consent_simulated === 1,
  };
}

export async function listRecentSubmissionsAction() {
  return listRecentSubmissions(8).map((r) => ({
    id: r.id,
    fleet_id: r.fleet_id,
    created_at: r.created_at,
    prospect: JSON.parse(r.prospect_json) as ProspectPayload,
    score: JSON.parse(r.score_json) as RiskScore,
  }));
}
