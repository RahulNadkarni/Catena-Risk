import { createCatenaClientFromEnv } from "@/lib/catena/client";

export interface FleetRiskSummary {
  fleetId: string;
  fleetRef: string | null;
  name: string;
  vehicleCount: number;
  driverCount: number;
  safetyEvents30d: number;
  hosViolations30d: number;
  activeDrivers: number;   // currently on-duty or driving
  liveIndicator: "low" | "medium" | "high" | "unknown";
  eventsPerVehicle: number | null;
}

function str(obj: unknown, key: string): string | null {
  if (!obj || typeof obj !== "object") return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" && v ? v : null;
}

function num(obj: unknown, key: string): number | null {
  if (!obj || typeof obj !== "object") return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

type PaginatedCall = (p: { size: number; cursor?: string }) => Promise<{
  items?: unknown[];
  next_page?: string | null;
}>;

/**
 * Paginate a list endpoint globally (no fleet filter) up to `maxPages`.
 * The sandbox does not consistently honor `fleet_ids` on all endpoints, so we
 * fetch broadly and partition by `fleet_id` in memory — this is the only way to
 * get per-fleet counts that actually differ across fleets.
 */
async function paginateCapped(
  call: PaginatedCall,
  maxPages = 10,
  pageSize = 200,
): Promise<unknown[]> {
  const out: unknown[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await call({ size: pageSize, cursor });
    const rows = (page?.items ?? []) as unknown[];
    out.push(...rows);
    const next = page?.next_page;
    if (typeof next !== "string" || next.length === 0) break;
    cursor = next;
  }
  return out;
}

/**
 * Per-fleet risk summary. Fetches each list endpoint globally (paginated, cap
 * 10 pages × 200 = 2000 rows), then groups by `fleet_id` client-side so each
 * fleet row gets its own counts rather than the same global totals.
 */
export async function fetchFleetRiskSummaries(limit = 12): Promise<FleetRiskSummary[]> {
  const client = createCatenaClientFromEnv();

  const [fleetsRes, safetyEvents, hosViolations, hosAvails, vehicles] = await Promise.all([
    client.listFleets({ size: limit }),
    paginateCapped((p) => client.listDriverSafetyEvents(p) as ReturnType<PaginatedCall>).catch(
      () => [] as unknown[],
    ),
    paginateCapped((p) => client.listHosViolations(p) as ReturnType<PaginatedCall>).catch(
      () => [] as unknown[],
    ),
    paginateCapped((p) => client.listHosAvailabilities(p) as ReturnType<PaginatedCall>).catch(
      () => [] as unknown[],
    ),
    paginateCapped((p) => client.listVehicles(p) as ReturnType<PaginatedCall>).catch(
      () => [] as unknown[],
    ),
  ]);

  const fleets = (fleetsRes?.items ?? []) as unknown[];
  const thirty = Date.now() - 30 * 24 * 3600_000;

  const eventsByFleet = new Map<string, number>();
  const violsByFleet = new Map<string, number>();
  const driversByFleet = new Map<string, Set<string>>();
  const activeByFleet = new Map<string, number>();
  const vehiclesByFleet = new Map<string, Set<string>>();

  for (const v of vehicles) {
    const fid = str(v, "fleet_id");
    const vid = str(v, "id") ?? str(v, "vehicle_id");
    if (!fid || !vid) continue;
    if (!vehiclesByFleet.has(fid)) vehiclesByFleet.set(fid, new Set());
    vehiclesByFleet.get(fid)!.add(vid);
  }
  for (const e of safetyEvents) {
    const fid = str(e, "fleet_id");
    if (!fid) continue;
    const at = str(e, "occurred_at");
    if (!at || new Date(at).getTime() < thirty) continue;
    eventsByFleet.set(fid, (eventsByFleet.get(fid) ?? 0) + 1);
    const vid = str(e, "vehicle_id");
    if (vid) {
      if (!vehiclesByFleet.has(fid)) vehiclesByFleet.set(fid, new Set());
      vehiclesByFleet.get(fid)!.add(vid);
    }
  }
  for (const v of hosViolations) {
    const fid = str(v, "fleet_id");
    if (!fid) continue;
    const at = str(v, "occurred_at");
    if (!at || new Date(at).getTime() < thirty) continue;
    violsByFleet.set(fid, (violsByFleet.get(fid) ?? 0) + 1);
  }
  for (const h of hosAvails) {
    const fid = str(h, "fleet_id");
    if (!fid) continue;
    const did = str(h, "driver_id");
    if (did) {
      if (!driversByFleet.has(fid)) driversByFleet.set(fid, new Set());
      driversByFleet.get(fid)!.add(did);
    }
    const code = str(h, "duty_status_code");
    if (code === "D" || code === "ON" || code === "YM") {
      activeByFleet.set(fid, (activeByFleet.get(fid) ?? 0) + 1);
    }
  }

  return fleets.map((f) => {
    const fleetId = str(f, "id") ?? "";
    const fleetRef = str(f, "fleet_ref");
    const name = str(f, "name") ?? str(f, "display_name") ?? fleetRef ?? fleetId.slice(0, 8);
    const vehicleCount = vehiclesByFleet.get(fleetId)?.size ?? 0;
    const driverCount = driversByFleet.get(fleetId)?.size ?? 0;
    const events30d = eventsByFleet.get(fleetId) ?? 0;
    const viol30d = violsByFleet.get(fleetId) ?? 0;
    const active = activeByFleet.get(fleetId) ?? 0;

    // Risk indicator: events per vehicle per month.
    // Cutoffs (<1 low, 1–3 medium, ≥3 high) are HARDCODED demo heuristics.
    // No Catena API exposes a "fleet risk tier" — live risk categorization is
    // app-side policy and would, in production, come from an internal risk-
    // policy service (same pattern as tier cutoffs in src/lib/risk/scoring.ts).
    const eventsPerVehicle = vehicleCount > 0 ? events30d / vehicleCount : null;
    let liveIndicator: FleetRiskSummary["liveIndicator"] = "unknown";
    if (eventsPerVehicle != null) {
      if (eventsPerVehicle < 1) liveIndicator = "low";
      else if (eventsPerVehicle < 3) liveIndicator = "medium";
      else liveIndicator = "high";
    }

    return {
      fleetId,
      fleetRef,
      name,
      vehicleCount,
      driverCount,
      safetyEvents30d: events30d,
      hosViolations30d: viol30d,
      activeDrivers: active,
      liveIndicator,
      eventsPerVehicle: eventsPerVehicle != null ? Math.round(eventsPerVehicle * 10) / 10 : null,
    };
  });
}

export interface TopDriverRisk {
  driverId: string;
  /** The sandbox's driver-summaries endpoint returns synthetic `first_name` /
   *  `username` values (Driver_*, user_*) for many drivers while the
   *  live-locations stream carries their real handle (e.g. `rita.hanson`).
   *  This field is populated from that live-locations join so the UI has a
   *  real name to render where the summary record alone would not. */
  liveLocationName: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  safetyEvents30d: number;
  hosViolations30d: number;
  rulesetCode: string | null;
}

/**
 * Returns the top N drivers by safety event count over the past 30 days.
 * Joins `listDriverSummaries` (metrics) with `listVehicleLiveLocations`
 * (real TSP driver_name handle) so the UI can render a human name even when
 * the summary row's first/last/username are all synthetic placeholders.
 */
export async function fetchTopRiskDrivers(limit = 10): Promise<TopDriverRisk[]> {
  const client = createCatenaClientFromEnv();
  const [summRes, liveLocRes] = await Promise.all([
    client.listDriverSummaries({ size: 100 }).catch(() => null),
    client.listVehicleLiveLocations({ size: 500 }).catch(() => null),
  ]);
  const summaries = (summRes?.items ?? []) as unknown[];
  const liveLocs =
    ((liveLocRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];

  const liveNameByDriverId = new Map<string, string>();
  for (const loc of liveLocs) {
    const did = str(loc, "driver_id");
    const raw = str(loc, "driver_name");
    if (!did || !raw || raw.startsWith("user_")) continue;
    liveNameByDriverId.set(
      did,
      raw.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    );
  }

  return summaries
    .map((s) => {
      const driverId = str(s, "user_id") ?? "";
      return {
        driverId,
        liveLocationName: liveNameByDriverId.get(driverId) ?? null,
        username: str(s, "username"),
        firstName: str(s, "first_name"),
        lastName: str(s, "last_name"),
        safetyEvents30d: num(s, "safety_events_30d") ?? 0,
        hosViolations30d: num(s, "hos_violations_30d") ?? 0,
        rulesetCode: str(s, "hos_ruleset_code"),
      };
    })
    .filter((d) => d.driverId && (d.safetyEvents30d > 0 || d.hosViolations30d > 0))
    .sort((a, b) => {
      // HOS-violation 2× weight is HARDCODED heuristic for driver ranking.
      // No Catena API returns ranked "top risk drivers"; this ordering is
      // purely app-side. Production would source the weights from the same
      // internal rating-policy service as src/lib/risk/weights.ts.
      const scoreA = a.safetyEvents30d + a.hosViolations30d * 2;
      const scoreB = b.safetyEvents30d + b.hosViolations30d * 2;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

export interface SafetyEventTypeBreakdown {
  type: string;
  count: number;
}

/**
 * Returns a breakdown of safety events by type (speeding, harsh_turn, etc.)
 * over the past 30 days.
 */
export async function fetchSafetyEventBreakdown(): Promise<SafetyEventTypeBreakdown[]> {
  const client = createCatenaClientFromEnv();
  const res = await client.listDriverSafetyEvents({ size: 200 });
  const events = (res?.items ?? []) as unknown[];
  const thirty = Date.now() - 30 * 24 * 3600_000;

  const counts = new Map<string, number>();
  for (const e of events) {
    const at = str(e, "occurred_at");
    if (!at || new Date(at).getTime() < thirty) continue;
    const type = (str(e, "event") ?? "unknown").replace(/_/g, " ");
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}
