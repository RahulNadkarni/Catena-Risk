import { createCatenaClientFromEnv } from "@/lib/catena/client";

export interface FleetDetailSummary {
  fleetId: string;
  fleetRef: string | null;
  name: string;
  vehicleCount: number;
  driverCount: number;
  activeDrivers: number;
  safetyEvents30d: number;
  hosViolations30d: number;
  eventBreakdown: { type: string; count: number }[];
  recentEvents: {
    id: string;
    eventType: string;
    occurredAt: string;
    vehicleId: string;
    driverId: string;
    durationSeconds: number | null;
  }[];
  recentViolations: {
    id: string;
    code: string | null;
    occurredAt: string;
    driverId: string;
  }[];
  dutyStatusCounts: Record<string, number>;
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

export async function fetchFleetDetail(fleetId: string): Promise<FleetDetailSummary | null> {
  const client = createCatenaClientFromEnv();

  const [fleetsRes, safetyRes, violRes, hosAvailRes, vehiclesRes] = await Promise.all([
    client.listFleets({ size: 100 }),
    client.listDriverSafetyEvents({ size: 200 }),
    client.listHosViolations({ size: 200 }),
    client.listHosAvailabilities({ size: 100 }),
    client.listVehicles({ size: 200 }).catch(() => null),
  ]);

  const fleets = (fleetsRes?.items ?? []) as unknown[];
  const fleet = fleets.find((f) => str(f, "id") === fleetId);
  if (!fleet) return null;

  const safetyEvents = (safetyRes?.items ?? []) as unknown[];
  const violations = (violRes?.items ?? []) as unknown[];
  const hosAvails = (hosAvailRes?.items ?? []) as unknown[];
  const vehicles = ((vehiclesRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];

  const thirty = Date.now() - 30 * 24 * 3600_000;
  const fleetEvents = safetyEvents.filter((e) => str(e, "fleet_id") === fleetId);
  const fleetViols = violations.filter((v) => str(v, "fleet_id") === fleetId);
  const fleetHosAvails = hosAvails.filter((h) => str(h, "fleet_id") === fleetId);
  const fleetVehicles = vehicles.filter((v) => str(v, "fleet_id") === fleetId);

  const events30d = fleetEvents.filter((e) => {
    const at = str(e, "occurred_at");
    return at && new Date(at).getTime() >= thirty;
  });
  const viols30d = fleetViols.filter((v) => {
    const at = str(v, "occurred_at");
    return at && new Date(at).getTime() >= thirty;
  });

  // Event type breakdown
  const typeCounts = new Map<string, number>();
  for (const e of events30d) {
    const t = (str(e, "event") ?? "unknown").replace(/_/g, " ");
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  const eventBreakdown = [...typeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Duty status distribution
  const dutyCounts: Record<string, number> = {};
  for (const h of fleetHosAvails) {
    const code = str(h, "duty_status_code") ?? "UNKNOWN";
    dutyCounts[code] = (dutyCounts[code] ?? 0) + 1;
  }
  const activeDrivers = (dutyCounts.D ?? 0) + (dutyCounts.ON ?? 0) + (dutyCounts.YM ?? 0);

  // Count unique vehicles from events if vehicles API didn't work for this fleet
  const uniqueVehiclesFromEvents = new Set(fleetEvents.map((e) => str(e, "vehicle_id")).filter(Boolean));
  const vehicleCount = fleetVehicles.length > 0 ? fleetVehicles.length : uniqueVehiclesFromEvents.size;

  return {
    fleetId,
    fleetRef: str(fleet, "fleet_ref"),
    name: str(fleet, "name") ?? str(fleet, "display_name") ?? str(fleet, "fleet_ref") ?? fleetId.slice(0, 8),
    vehicleCount,
    driverCount: fleetHosAvails.length,
    activeDrivers,
    safetyEvents30d: events30d.length,
    hosViolations30d: viols30d.length,
    eventBreakdown,
    recentEvents: events30d
      .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""))
      .slice(0, 15)
      .map((e) => ({
        id: str(e, "id") ?? "",
        eventType: (str(e, "event") ?? "unknown").replace(/_/g, " "),
        occurredAt: str(e, "occurred_at") ?? "",
        vehicleId: str(e, "vehicle_id") ?? "",
        driverId: str(e, "driver_id") ?? "",
        durationSeconds: num(e, "duration_seconds"),
      })),
    recentViolations: viols30d
      .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""))
      .slice(0, 10)
      .map((v) => ({
        id: str(v, "id") ?? "",
        code: str(v, "violation_code") ?? str(v, "rule_code"),
        occurredAt: str(v, "occurred_at") ?? "",
        driverId: str(v, "driver_id") ?? "",
      })),
    dutyStatusCounts: dutyCounts,
  };
}

export interface DriverDetailSummary {
  driverId: string;
  name: string;
  username: string | null;
  rulesetCode: string | null;
  licenseCountry: string | null;
  status: string | null;
  safetyEvents30d: number;
  hosViolations30d: number;
  eventsList: {
    id: string;
    eventType: string;
    occurredAt: string;
    vehicleId: string;
    durationSeconds: number | null;
  }[];
  violationsList: {
    id: string;
    code: string | null;
    occurredAt: string;
  }[];
  eventBreakdown: { type: string; count: number }[];
}

export async function fetchDriverProfile(driverId: string): Promise<DriverDetailSummary | null> {
  const client = createCatenaClientFromEnv();

  const [summRes, safetyRes, violRes] = await Promise.all([
    client.listDriverSummaries({ size: 100 }),
    client.listDriverSafetyEvents({ size: 200 }),
    client.listHosViolations({ size: 200 }),
  ]);

  const summaries = (summRes?.items ?? []) as unknown[];
  const safetyEvents = (safetyRes?.items ?? []) as unknown[];
  const violations = (violRes?.items ?? []) as unknown[];

  const summary = summaries.find((s) => str(s, "user_id") === driverId);

  // Events can be matched by driver_id (TSP) or user_id from summaries
  const driverEvents = safetyEvents.filter((e) => str(e, "driver_id") === driverId);
  const driverViolations = violations.filter((v) => str(v, "driver_id") === driverId);

  // If no events match this driver_id at all, driver doesn't exist in our data
  if (!summary && driverEvents.length === 0 && driverViolations.length === 0) return null;

  const firstName = str(summary, "first_name");
  const lastName = str(summary, "last_name");
  const username = str(summary, "username");
  const isSynthetic = !firstName || firstName.startsWith("Driver_") || firstName.startsWith("driver_");
  const name = (isSynthetic && username && !username.startsWith("user_"))
    ? username.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : `${firstName ?? "Driver"} ${lastName ?? driverId.slice(0, 6)}`;

  const typeCounts = new Map<string, number>();
  for (const e of driverEvents) {
    const t = (str(e, "event") ?? "unknown").replace(/_/g, " ");
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }

  return {
    driverId,
    name,
    username,
    rulesetCode: str(summary, "hos_ruleset_code"),
    licenseCountry: str(summary, "license_country"),
    status: str(summary, "status"),
    safetyEvents30d: num(summary, "safety_events_30d") ?? driverEvents.length,
    hosViolations30d: num(summary, "hos_violations_30d") ?? driverViolations.length,
    eventsList: driverEvents
      .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""))
      .slice(0, 30)
      .map((e) => ({
        id: str(e, "id") ?? "",
        eventType: (str(e, "event") ?? "unknown").replace(/_/g, " "),
        occurredAt: str(e, "occurred_at") ?? "",
        vehicleId: str(e, "vehicle_id") ?? "",
        durationSeconds: num(e, "duration_seconds"),
      })),
    violationsList: driverViolations
      .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""))
      .slice(0, 20)
      .map((v) => ({
        id: str(v, "id") ?? "",
        code: str(v, "violation_code") ?? str(v, "rule_code"),
        occurredAt: str(v, "occurred_at") ?? "",
      })),
    eventBreakdown: [...typeCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
  };
}
