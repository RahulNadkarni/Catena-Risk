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
import { listHeroFleetIds } from "@/lib/underwriting/hero-fleets";

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

export async function sendConsentInvitation(input: {
  fleetId: string;
  prospect: ProspectPayload;
}): Promise<{ ok: boolean; simulated: boolean; trace: ApiTraceEntry[] }> {
  const trace: ApiTraceEntry[] = [];
  const client = createCatenaClientFromEnv();
  let simulated = false;

  try {
    await timed(
      "createInvitation",
      "/v2/orgs/invitations",
      "POST",
      () =>
        client.createInvitation({
          fleet_id: input.fleetId,
          partner_slug: process.env.CATENA_PARTNER_SLUG ?? "catena-candidates",
        }),
      trace,
    );
  } catch {
    simulated = true;
    trace.push({
      path: "/v2/orgs/invitations",
      method: "POST",
      ms: 0,
      status: 0,
      at: nowIso(),
      label: "createInvitation:demo_skipped",
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
    }
  } catch {
    simulated = true;
  }

  return { ok: true, simulated, trace };
}

export async function createSubmission(input: {
  fleetId: string;
  prospect: ProspectPayload;
  consentTrace?: ApiTraceEntry[];
  consentSimulated?: boolean;
}): Promise<{ submissionId: string; endpointTimings: Record<string, number> }> {
  const client = createCatenaClientFromEnv();
  const heroIds = await listHeroFleetIds();
  const fixtureDossiers = await Promise.all(
    heroIds.map((id) => buildFleetDossier(id, { source: "fixtures" })),
  );

  const targetDossier = await getCachedFleetDossier(input.fleetId, {
    source: "api",
    windowDays: 90,
    pagination: { maxPages: 1, pageSize: 150 },
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

  return { submissionId, endpointTimings: targetDossier.meta.endpointTimings };
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
