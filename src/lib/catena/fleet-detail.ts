import { createCatenaClientFromEnv } from "@/lib/catena/client";

export interface FleetDetailSummary {
  fleetId: string;
  fleetRef: string | null;
  name: string;
  vehicleCount: number;
  driverCount: number;
  activeDrivers: number;
  trailerCount: number | null;
  safetyEvents30d: number;
  hosViolations30d: number;
  eventBreakdown: { type: string; count: number }[];
  recentEvents: {
    id: string;
    eventType: string;
    occurredAt: string;
    vehicleId: string;
    driverId: string;
    driverName: string | null;
    durationSeconds: number | null;
  }[];
  recentViolations: {
    id: string;
    code: string | null;
    occurredAt: string;
    driverId: string;
    driverName: string | null;
  }[];
  dutyStatusCounts: Record<string, number>;
}

type ListMethod = (p: { size: number; cursor?: string; fleet_ids: string[] }) => Promise<{
  items?: unknown[];
  next_page?: string | null;
}>;

/**
 * Paginate a list endpoint filtered to one fleet. Passes `fleet_ids` to the
 * API, but also applies a client-side `fleet_id` filter on each row — the
 * sandbox does not consistently honor the query parameter, so this guards
 * against the case where the API returns global data with the filter ignored.
 */
async function paginateByFleet(
  call: ListMethod,
  fleetId: string,
  cap = 2000,
): Promise<unknown[]> {
  const out: unknown[] = [];
  let cursor: string | undefined;
  let scanned = 0;
  const scanCap = cap * 3;
  while (out.length < cap && scanned < scanCap) {
    const page = await call({ size: 200, cursor, fleet_ids: [fleetId] });
    const items = (page?.items ?? []) as unknown[];
    scanned += items.length;
    for (const row of items) {
      if (typeof row === "object" && row !== null) {
        const fid = (row as Record<string, unknown>).fleet_id;
        if (typeof fid === "string" && fid !== fleetId) continue;
      }
      out.push(row);
      if (out.length >= cap) break;
    }
    const next = page?.next_page;
    if (typeof next !== "string" || next.length === 0) break;
    cursor = next;
  }
  return out;
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

  // Resolve the fleet record from the fleets list. Small org, so one page is fine.
  const fleetsRes = await client.listFleets({ size: 100 });
  const fleets = (fleetsRes?.items ?? []) as unknown[];
  const fleet = fleets.find((f) => str(f, "id") === fleetId);
  if (!fleet) return null;

  const [fleetSummaryPage, safetyEvents, violations, hosAvails, vehicles, trailers, driverSummariesRes] =
    await Promise.all([
      client
        .listFleetSummaries({ fleet_ids: [fleetId], size: 10 })
        .catch(() => null),
      paginateByFleet(
        (p) => client.listDriverSafetyEvents(p) as ReturnType<ListMethod>,
        fleetId,
      ),
      paginateByFleet(
        (p) => client.listHosViolations(p) as ReturnType<ListMethod>,
        fleetId,
      ),
      paginateByFleet(
        (p) => client.listHosAvailabilities(p) as ReturnType<ListMethod>,
        fleetId,
      ),
      paginateByFleet(
        (p) => client.listVehicles(p) as ReturnType<ListMethod>,
        fleetId,
      ).catch(() => [] as unknown[]),
      paginateByFleet(
        (p) => client.listTrailers(p) as ReturnType<ListMethod>,
        fleetId,
        500,
      ).catch(() => [] as unknown[]),
      client.listDriverSummaries({ fleet_ids: [fleetId], size: 500 }).catch(() => null),
    ]);

  // Live locations carry the real TSP driver handle (e.g. "rita.hanson") in
  // `driver_name` even when the analytics summary only has synthetic values.
  // Fetched here in parallel with the rest so we can populate display names
  // from whichever source has the real string. Also scoped to the fleet when
  // possible but done globally as a fallback since live-locations is small.
  const liveLocRes = await client
    .listVehicleLiveLocations({ size: 500 })
    .catch(() => null);
  const liveLocs = ((liveLocRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const driverSummaries = ((driverSummariesRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];

  const nameByDriverId = new Map<string, string>();
  // Priority 1: live-locations driver_name (most reliable on the sandbox).
  for (const loc of liveLocs) {
    const did = str(loc, "driver_id");
    const raw = str(loc, "driver_name");
    if (!did || !raw || raw.startsWith("user_")) continue;
    nameByDriverId.set(
      did,
      raw.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    );
  }
  // Priority 2: driver summaries for drivers not present in live-locations.
  for (const s of driverSummaries) {
    const uid = str(s, "user_id");
    if (!uid || nameByDriverId.has(uid)) continue;
    const first = str(s, "first_name");
    const last = str(s, "last_name");
    const username = str(s, "username");
    const isSynthFirst = !first || first.startsWith("Driver_") || first.startsWith("driver_");
    if (!isSynthFirst && first && last) {
      nameByDriverId.set(uid, `${first} ${last}`);
    } else if (!isSynthFirst && first) {
      nameByDriverId.set(uid, first);
    } else if (username && !username.startsWith("user_")) {
      nameByDriverId.set(
        uid,
        username.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      );
    }
  }

  const thirty = Date.now() - 30 * 24 * 3600_000;
  const events30d = safetyEvents.filter((e) => {
    const at = str(e, "occurred_at");
    return at && new Date(at).getTime() >= thirty;
  });
  const viols30d = violations.filter((v) => {
    const at = str(v, "occurred_at");
    return at && new Date(at).getTime() >= thirty;
  });

  const typeCounts = new Map<string, number>();
  for (const e of events30d) {
    const t = (str(e, "event") ?? "unknown").replace(/_/g, " ");
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  const eventBreakdown = [...typeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const dutyCounts: Record<string, number> = {};
  for (const h of hosAvails) {
    const code = str(h, "duty_status_code") ?? "UNKNOWN";
    dutyCounts[code] = (dutyCounts[code] ?? 0) + 1;
  }
  const activeDrivers = (dutyCounts.D ?? 0) + (dutyCounts.ON ?? 0) + (dutyCounts.YM ?? 0);

  // Prefer analytics summary counts when present, else fall back to list lengths.
  const summaryRec =
    (fleetSummaryPage as { items?: unknown[] } | null)?.items?.find(
      (s) => str(s, "fleet_id") === fleetId || str(s, "id") === fleetId,
    ) ?? null;
  const summaryVehicleCount = num(summaryRec, "vehicles_count") ?? num(summaryRec, "vehicles");
  const summaryDriverCount = num(summaryRec, "drivers_count") ?? num(summaryRec, "drivers");

  const vehicleCount = summaryVehicleCount ?? vehicles.length;
  const driverCount = summaryDriverCount ?? hosAvails.length;

  return {
    fleetId,
    fleetRef: str(fleet, "fleet_ref"),
    name: str(fleet, "name") ?? str(fleet, "display_name") ?? str(fleet, "fleet_ref") ?? fleetId.slice(0, 8),
    vehicleCount,
    driverCount,
    activeDrivers,
    trailerCount: trailers.length > 0 ? trailers.length : null,
    safetyEvents30d: events30d.length,
    hosViolations30d: viols30d.length,
    eventBreakdown,
    recentEvents: events30d
      .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""))
      .slice(0, 15)
      .map((e) => {
        const did = str(e, "driver_id") ?? "";
        return {
          id: str(e, "id") ?? "",
          eventType: (str(e, "event") ?? "unknown").replace(/_/g, " "),
          occurredAt: str(e, "occurred_at") ?? "",
          vehicleId: str(e, "vehicle_id") ?? "",
          driverId: did,
          driverName: nameByDriverId.get(did) ?? null,
          durationSeconds: num(e, "duration_seconds"),
        };
      }),
    recentViolations: viols30d
      .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""))
      .slice(0, 10)
      .map((v) => {
        const did = str(v, "driver_id") ?? "";
        return {
          id: str(v, "id") ?? "",
          code: str(v, "violation_code") ?? str(v, "rule_code"),
          occurredAt: str(v, "occurred_at") ?? "",
          driverId: did,
          driverName: nameByDriverId.get(did) ?? null,
        };
      }),
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
