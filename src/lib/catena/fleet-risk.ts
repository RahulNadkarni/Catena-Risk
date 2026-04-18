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

/**
 * Aggregates safety events, HOS violations, and vehicle counts per fleet.
 * Produces a live risk indicator for each fleet by comparing event density.
 */
export async function fetchFleetRiskSummaries(limit = 12): Promise<FleetRiskSummary[]> {
  const client = createCatenaClientFromEnv();

  const [fleetsRes, safetyRes, violRes, hosAvailRes] = await Promise.all([
    client.listFleets({ size: limit }),
    client.listDriverSafetyEvents({ size: 200 }),
    client.listHosViolations({ size: 200 }),
    client.listHosAvailabilities({ size: 100 }),
  ]);

  const fleets = (fleetsRes?.items ?? []) as unknown[];
  const safetyEvents = (safetyRes?.items ?? []) as unknown[];
  const hosViolations = (violRes?.items ?? []) as unknown[];
  const hosAvails = (hosAvailRes?.items ?? []) as unknown[];

  const thirty = Date.now() - 30 * 24 * 3600_000;
  const eventsByFleet = new Map<string, number>();
  const violsByFleet = new Map<string, number>();
  const vehiclesByFleet = new Map<string, Set<string>>();
  const driversByFleet = new Map<string, Set<string>>();
  const activeByFleet = new Map<string, number>();

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
    const vehicles = vehiclesByFleet.get(fleetId)?.size ?? 0;
    const drivers = driversByFleet.get(fleetId)?.size ?? 0;
    const events30d = eventsByFleet.get(fleetId) ?? 0;
    const viol30d = violsByFleet.get(fleetId) ?? 0;
    const active = activeByFleet.get(fleetId) ?? 0;

    // Risk indicator: events per vehicle per month
    const eventsPerVehicle = vehicles > 0 ? events30d / vehicles : null;
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
      vehicleCount: vehicles,
      driverCount: drivers,
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
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  safetyEvents30d: number;
  hosViolations30d: number;
  rulesetCode: string | null;
}

/**
 * Returns the top N drivers by safety event count over the past 30 days,
 * using the Catena driver-summaries analytics endpoint.
 */
export async function fetchTopRiskDrivers(limit = 10): Promise<TopDriverRisk[]> {
  const client = createCatenaClientFromEnv();
  const summRes = await client.listDriverSummaries({ size: 100 }).catch(() => null);
  const summaries = (summRes?.items ?? []) as unknown[];

  return summaries
    .map((s) => ({
      driverId: str(s, "user_id") ?? "",
      username: str(s, "username"),
      firstName: str(s, "first_name"),
      lastName: str(s, "last_name"),
      safetyEvents30d: num(s, "safety_events_30d") ?? 0,
      hosViolations30d: num(s, "hos_violations_30d") ?? 0,
      rulesetCode: str(s, "hos_ruleset_code"),
    }))
    .filter((d) => d.driverId && (d.safetyEvents30d > 0 || d.hosViolations30d > 0))
    .sort((a, b) => {
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
