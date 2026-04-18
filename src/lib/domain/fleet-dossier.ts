import fs from "node:fs/promises";
import path from "node:path";
import { subDays } from "date-fns/subDays";
import type { CatenaClient } from "../catena/client";
import type {
  ConnectionRead,
  DriverSafetyEventRead,
  DvirDefectRead,
  DvirLogRead,
  EngineLogRead,
  GetFleetResponse,
  HosAvailabilityRead,
  HosDailySnapshotRead,
  HosEventRead,
  HosViolationRead,
  UserRead,
  VehicleLocationRead,
  VehicleRead,
} from "../catena/types";

type CursorPage<T> = {
  items: T[];
  next_page?: string | null;
};

export interface VehicleRegionSegment {
  /** Placeholder until Catena exposes region segment lists */
  _brand: "VehicleRegionSegment";
}

export interface FuelTransaction {
  /** No public fuel transaction API yet — always empty in Phase 1 */
  _brand: "FuelTransaction";
}

export interface DataFreshnessRow {
  connectionId: string;
  sourceName: string;
  status: string;
  updatedAt: string;
}

export interface DataFreshnessSummary {
  fleetId: string;
  rows: DataFreshnessRow[];
}

export interface DriverVehicleAssociation {
  driver_id: string;
  vehicle_id: string;
}

export interface FleetDossierMeta {
  fetchedAt: string;
  source: "api" | "fixtures";
  totalApiCalls: number;
  totalLatencyMs: number;
  endpointTimings: Record<string, number>;
  windowDays: number;
  /** Per-endpoint outcome so the UI can surface partial-data warnings. */
  fetchStatus: Record<string, { ok: boolean; pagesFetched: number; itemsFetched: number; error?: string }>;
}

export interface FleetDossier {
  fleetId: string;
  window: { start: string; end: string };
  source: "api" | "fixtures";
  meta: FleetDossierMeta;
  fleet: GetFleetResponse | null;
  vehicles: VehicleRead[];
  users: UserRead[];
  safetyEvents: DriverSafetyEventRead[];
  vehicleLocations: VehicleLocationRead[];
  hosEvents: HosEventRead[];
  hosViolations: HosViolationRead[];
  hosDailySnapshots: HosDailySnapshotRead[];
  hosAvailabilities: HosAvailabilityRead[];
  dvirLogs: DvirLogRead[];
  dvirDefects: DvirDefectRead[];
  engineLogs: EngineLogRead[];
  connections: ConnectionRead[];
  analyticsOverview: Record<string, unknown> | null;
  regionSegments: VehicleRegionSegment[];
  /** Always empty until a fuel tx endpoint exists */
  fuelTransactions: FuelTransaction[];
  dataFreshness: DataFreshnessSummary;
  driverVehicleAssociations: DriverVehicleAssociation[];
  /**
   * Labels of **critical** endpoints (the ones whose output feeds a risk sub-score)
   * that returned partial data due to a failure on a later page. First-page
   * failures on critical endpoints throw and abort the dossier build — they
   * never reach this array. Empty array = every critical endpoint succeeded in full.
   */
  dataGaps: string[];
}

/**
 * Thrown by `buildFleetDossier` when a **critical** endpoint fails on its first
 * page. Critical endpoints are the ones whose output feeds a risk sub-score
 * (driver-safety-events, vehicle-locations, hos-violations, hos-availabilities,
 * dvir-logs). Failing them silently would produce a falsely clean risk score,
 * so we surface the error to the UI instead of returning empty arrays.
 */
export class DossierFetchError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly cause: unknown,
  ) {
    super(`Catena ${endpoint} failed: ${formatFetchCause(cause)}`);
    this.name = "DossierFetchError";
  }
}

/** Extract a human-readable detail from an axios-style error so the UI shows
 *  the actual 400/422 reason instead of "Request failed with status code 400". */
function formatFetchCause(cause: unknown): string {
  if (cause && typeof cause === "object" && "response" in cause) {
    const r = (cause as { response?: { status?: number; data?: unknown } }).response;
    if (r?.status) {
      const body = r.data;
      let detail = "";
      if (body && typeof body === "object") {
        const d = body as Record<string, unknown>;
        if ("detail" in d) {
          const raw = d.detail;
          if (typeof raw === "string") detail = raw;
          else if (Array.isArray(raw)) {
            detail = raw
              .map((item) => {
                if (typeof item === "string") return item;
                if (item && typeof item === "object") {
                  const o = item as Record<string, unknown>;
                  const loc = Array.isArray(o.loc) ? o.loc.filter((p) => p !== "body").join(".") : null;
                  const msg = typeof o.msg === "string" ? o.msg : null;
                  if (loc && msg) return `${loc}: ${msg}`;
                  return msg ?? JSON.stringify(item);
                }
                return String(item);
              })
              .join("; ");
          } else {
            detail = JSON.stringify(raw);
          }
        } else if ("message" in d && typeof d.message === "string") {
          detail = d.message;
        } else {
          detail = JSON.stringify(d);
        }
      } else if (typeof body === "string") {
        detail = body;
      }
      return `HTTP ${r.status}${detail ? ` — ${detail}` : ""}`;
    }
  }
  if (cause instanceof Error) return cause.message;
  if (typeof cause === "string") return cause;
  return "unknown error";
}

interface FixtureAgg {
  fleet_id: string;
  score: number;
  vehicles: unknown[];
  users: unknown[];
  safety: unknown[];
  hosEvents: unknown[];
  dvirLogs: unknown[];
  locations: unknown[];
}

function bumpTiming(meta: FleetDossierMeta, label: string, ms: number) {
  meta.totalApiCalls += 1;
  meta.totalLatencyMs += ms;
  meta.endpointTimings[label] = (meta.endpointTimings[label] ?? 0) + ms;
}

function looksLikeConnection(o: Record<string, unknown>): boolean {
  return (
    o.credentials !== undefined &&
    typeof o.credentials === "object" &&
    o.credentials !== null &&
    "vehicle_name" in o === false &&
    "vin" in o === false
  );
}

/** Split mis-bucketed rows from `seed:fixtures` mixed into `vehicles[]` */
function partitionFixtureVehicleBucket(rows: unknown[]): {
  vehicles: VehicleRead[];
  connections: ConnectionRead[];
} {
  const vehicles: VehicleRead[] = [];
  const connections: ConnectionRead[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.magic_link === "string") continue;
    if (looksLikeConnection(o)) {
      connections.push(o as ConnectionRead);
      continue;
    }
    if (o.vehicle_name != null || o.vin != null || o.connection_id != null) {
      vehicles.push(o as VehicleRead);
    }
  }
  return { vehicles, connections };
}

function synthesizeDataFreshness(fleetId: string, connections: ConnectionRead[]): DataFreshnessSummary {
  const rows = connections
    .filter((c) => c.fleet_id === fleetId)
    .map((c) => ({
      connectionId: c.id,
      sourceName: c.source_name,
      status: c.status,
      updatedAt: c.updated_at,
    }));
  return { fleetId, rows };
}

function deriveDriverVehiclePairs(d: FleetDossier): DriverVehicleAssociation[] {
  const set = new Set<string>();
  const out: DriverVehicleAssociation[] = [];
  const push = (driver_id: string | undefined | null, vehicle_id: string | undefined | null) => {
    if (!driver_id || !vehicle_id) return;
    const key = `${driver_id}:${vehicle_id}`;
    if (set.has(key)) return;
    set.add(key);
    out.push({ driver_id, vehicle_id });
  };
  for (const ev of d.safetyEvents) push(ev.driver_id, ev.vehicle_id);
  for (const loc of d.vehicleLocations) push(loc.driver_id ?? null, loc.vehicle_id);
  for (const h of d.hosEvents) push(h.driver_id, h.vehicle_id ?? null);
  return out;
}

async function loadFixtureFile(fleetId: string): Promise<FixtureAgg> {
  const dir = path.join(process.cwd(), "src/lib/fixtures/fleets");
  const names = await fs.readdir(dir);
  for (const n of names) {
    if (!n.endsWith(".json")) continue;
    const full = path.join(dir, n);
    const text = await fs.readFile(full, "utf8");
    const doc = JSON.parse(text) as FixtureAgg;
    if (doc.fleet_id === fleetId) return doc;
  }
  throw new Error(`No fixture bundle found for fleet_id=${fleetId} under src/lib/fixtures/fleets`);
}

async function collectPaged<T>(
  label: string,
  meta: FleetDossierMeta,
  fetchPage: (cursor?: string | null) => Promise<CursorPage<T>>,
  options: { maxPages: number; size: number; critical?: boolean },
): Promise<T[]> {
  const acc: T[] = [];
  let cursor: string | undefined;
  let pagesFetched = 0;
  for (let p = 0; p < options.maxPages; p++) {
    const t0 = Date.now();
    try {
      const res = await fetchPage(cursor);
      bumpTiming(meta, `${label}#${p}`, Date.now() - t0);
      acc.push(...(res.items ?? []));
      pagesFetched += 1;
      const next = res.next_page;
      if (typeof next === "string" && next.length > 0) {
        cursor = next;
      } else {
        break;
      }
    } catch (e) {
      bumpTiming(meta, `${label}#${p}:error`, Date.now() - t0);
      const errMsg = e instanceof Error ? e.message : String(e);
      meta.fetchStatus[label] = {
        ok: false,
        pagesFetched,
        itemsFetched: acc.length,
        error: errMsg,
      };
      // A first-page failure on a score-critical endpoint is fatal — returning
      // an empty array would produce a falsely clean risk score. Surface it.
      if (options.critical && p === 0) {
        throw new DossierFetchError(label, e);
      }
      // eslint-disable-next-line no-console
      console.warn(`[buildFleetDossier] ${label} page ${p} failed`, e);
      return acc;
    }
  }
  meta.fetchStatus[label] = { ok: true, pagesFetched, itemsFetched: acc.length };
  return acc;
}

function emptyMeta(source: "api" | "fixtures", windowDays: number): FleetDossierMeta {
  return {
    fetchedAt: new Date().toISOString(),
    source,
    totalApiCalls: 0,
    totalLatencyMs: 0,
    endpointTimings: {},
    windowDays,
    fetchStatus: {},
  };
}

function normalizeFleetForFixture(fleetId: string): GetFleetResponse {
  const now = new Date().toISOString();
  return {
    id: fleetId,
    name: null,
    created_at: now,
    updated_at: now,
  } as GetFleetResponse;
}

/**
 * Labels of endpoints whose output feeds a risk sub-score or the exposure
 * denominators. If any of these returns partial data, `dossier.dataGaps` picks
 * it up so the UI can warn the underwriter instead of silently producing a
 * falsely-clean score.
 */
const CRITICAL_DOSSIER_ENDPOINTS = new Set<string>([
  "listDriverSafetyEvents",
  "listVehicleLocations",
  "listHosViolations",
  "listHosAvailabilities",
  "listDvirLogs",
]);

/**
 * Loads a single-fleet snapshot from the API (parallel requests, graceful degradation) or offline
 * fixtures. Cursor lists default to **one page**; set `pagination.maxPages` > 1 to follow `next_page`
 * until exhausted or the cap is reached.
 */
export async function buildFleetDossier(
  fleetId: string,
  options?: {
    client?: CatenaClient;
    source?: "api" | "fixtures";
    windowDays?: number;
    pagination?: { maxPages?: number; pageSize?: number };
  },
): Promise<FleetDossier> {
  const source = options?.source ?? "api";
  const windowDays = options?.windowDays ?? 90;
  const maxPages = options?.pagination?.maxPages ?? 1;
  const pageSize = options?.pagination?.pageSize ?? 150;
  const windowEnd = new Date();
  const windowStart = subDays(windowEnd, windowDays);

  if (source === "fixtures") {
    const fx = await loadFixtureFile(fleetId);
    const meta = emptyMeta("fixtures", windowDays);
    const { vehicles: vFromBucket, connections: cFromVehicles } = partitionFixtureVehicleBucket(fx.vehicles);

    const fleet = normalizeFleetForFixture(fleetId);

    const dossier: FleetDossier = {
      fleetId,
      window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
      source: "fixtures",
      meta,
      fleet,
      vehicles: vFromBucket,
      users: fx.users as UserRead[],
      safetyEvents: fx.safety as DriverSafetyEventRead[],
      vehicleLocations: fx.locations as VehicleLocationRead[],
      hosEvents: fx.hosEvents as HosEventRead[],
      hosViolations: [],
      hosDailySnapshots: [],
      hosAvailabilities: [],
      dvirLogs: fx.dvirLogs as DvirLogRead[],
      dvirDefects: [],
      engineLogs: [],
      connections: cFromVehicles,
      analyticsOverview: null,
      regionSegments: [] as FleetDossier["regionSegments"],
      fuelTransactions: [] as FleetDossier["fuelTransactions"],
      dataFreshness: synthesizeDataFreshness(fleetId, cFromVehicles),
      driverVehicleAssociations: [],
      dataGaps: [],
    };
    dossier.driverVehicleAssociations = deriveDriverVehiclePairs(dossier);
    return dossier;
  }

  /** Dynamic import keeps `axios`/HTTP stack off the load path for `source: 'fixtures'` (e.g. CLI on Node 24). */
  const client =
    options?.client ?? (await import("../catena/client")).createCatenaClientFromEnv();
  const meta = emptyMeta("api", windowDays);
  const range = { from_datetime: windowStart.toISOString(), to_datetime: windowEnd.toISOString() };
  const fp: { fleet_ids: string[]; size: number } = { fleet_ids: [fleetId], size: pageSize };

  const timedOne = async <T>(label: string, fn: () => Promise<T>, empty: T): Promise<T> => {
    const t0 = Date.now();
    try {
      const r = await fn();
      bumpTiming(meta, label, Date.now() - t0);
      meta.fetchStatus[label] = { ok: true, pagesFetched: 1, itemsFetched: 1 };
      return r;
    } catch (e) {
      bumpTiming(meta, `${label}:error`, Date.now() - t0);
      const errMsg = e instanceof Error ? e.message : String(e);
      meta.fetchStatus[label] = { ok: false, pagesFetched: 0, itemsFetched: 0, error: errMsg };
      // eslint-disable-next-line no-console
      console.warn(`[buildFleetDossier] ${label} failed`, e);
      return empty;
    }
  };

  const [
    fleet,
    vehicles,
    users,
    safetyEvents,
    vehicleLocations,
    hosEvents,
    hosViolations,
    hosDailySnapshots,
    hosAvailabilities,
    dvirLogs,
    dvirDefects,
    engineLogs,
    connections,
    analyticsOverview,
  ] = await Promise.all([
    timedOne("getFleet", () => client.getFleet(fleetId), null),
    collectPaged("listVehicles", meta, (c) => client.listVehicles({ ...fp, cursor: c }), {
      maxPages,
      size: pageSize,
    }),
    collectPaged("listUsers", meta, (c) => client.listUsers({ ...fp, cursor: c }), {
      maxPages,
      size: pageSize,
    }),
    collectPaged(
      "listDriverSafetyEvents",
      meta,
      (c) => client.listDriverSafetyEvents({ ...fp, ...range, cursor: c }),
      { maxPages, size: pageSize, critical: true },
    ),
    collectPaged(
      "listVehicleLocations",
      meta,
      (c) => client.listVehicleLocations({ ...fp, ...range, cursor: c }),
      { maxPages, size: pageSize, critical: true },
    ),
    collectPaged(
      "listHosEvents",
      meta,
      (c) => client.listHosEvents({ ...fp, ...range, cursor: c }),
      { maxPages, size: pageSize },
    ),
    collectPaged(
      "listHosViolations",
      meta,
      (c) => client.listHosViolations({ ...fp, ...range, cursor: c }),
      { maxPages, size: pageSize, critical: true },
    ),
    collectPaged(
      "listHosDailySnapshots",
      meta,
      (c) => client.listHosDailySnapshots({ ...fp, ...range, cursor: c }),
      { maxPages, size: pageSize },
    ),
    collectPaged(
      "listHosAvailabilities",
      meta,
      (c) => client.listHosAvailabilities({ ...fp, cursor: c }),
      { maxPages, size: pageSize, critical: true },
    ),
    collectPaged(
      "listDvirLogs",
      meta,
      (c) => client.listDvirLogs({ ...fp, ...range, cursor: c }),
      { maxPages, size: pageSize, critical: true },
    ),
    // placeholder — defects are fetched per-log below (top-level /dvir-defects returns ERROR per COVERAGE.md)
    Promise.resolve([] as DvirDefectRead[]),
    collectPaged(
      "listEngineLogs",
      meta,
      (c) => client.listEngineLogs({ ...fp, ...range, cursor: c }),
      { maxPages, size: pageSize },
    ),
    (async () => {
      const raw = await collectPaged(
        "listConnections",
        meta,
        (c) => client.listConnections({ size: pageSize, cursor: c }),
        { maxPages, size: pageSize },
      );
      return raw.filter((x) => x.fleet_id === fleetId);
    })(),
    timedOne("getAnalyticsOverview", () => client.getAnalyticsOverview({ ...fp }), null),
  ]);

  // Fetch DVIR defects per log — correct endpoint per COVERAGE.md
  // /dvir-defects (top-level) always errors; must use /dvir-logs/{id}/defects
  const logsWithDefects = dvirLogs.filter((l) => (l as unknown as Record<string, unknown>)["defect_count"]);
  const perLogDefects = await Promise.all(
    logsWithDefects.map(async (l) => {
      const logId = (l as unknown as { id?: string }).id;
      if (!logId) return [];
      try {
        const res = await client.getDvirLogDefects(logId);
        return res?.items ?? [];
      } catch {
        return [];
      }
    }),
  );
  const resolvedDvirDefects: DvirDefectRead[] = perLogDefects.flat();
  // Merge with any placeholder empty array already in dvirDefects
  const allDvirDefects = [...dvirDefects, ...resolvedDvirDefects];

  meta.fetchedAt = new Date().toISOString();

  const dossier: FleetDossier = {
    fleetId,
    window: { start: range.from_datetime, end: range.to_datetime },
    source: "api",
    meta,
    fleet,
    vehicles,
    users,
    safetyEvents,
    vehicleLocations,
    hosEvents,
    hosViolations,
    hosDailySnapshots,
    hosAvailabilities,
    dvirLogs,
    dvirDefects: allDvirDefects,
    engineLogs,
    connections,
    analyticsOverview: analyticsOverview ?? null,
    regionSegments: [] as FleetDossier["regionSegments"],
    fuelTransactions: [] as FleetDossier["fuelTransactions"],
    dataFreshness: synthesizeDataFreshness(fleetId, connections),
    driverVehicleAssociations: [],
    dataGaps: Object.entries(meta.fetchStatus)
      .filter(([label, s]) => !s.ok && CRITICAL_DOSSIER_ENDPOINTS.has(label))
      .map(([label]) => label),
  };

  dossier.driverVehicleAssociations = deriveDriverVehiclePairs(dossier);
  return dossier;
}
