"use server";

import { createCatenaClientFromEnv } from "@/lib/catena/client";
import { fetchWeatherAtIncident } from "@/lib/enrichment/weather";
import { fetchRoadContext, reverseGeocode } from "@/lib/enrichment/roads";
import { demoDriverNameFor, DEMO_DRIVER_NAME_OVERRIDES } from "@/lib/fixtures/demo-driver-names";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TripPoint {
  lat: number;
  lng: number;
  locationName: string | null;
  at: string;
  cityName: string | null;
}

export interface DriverHosStatus {
  /** vehicle_id — used as the URL key for deep-link pages */
  driverId: string;
  /** TSP-namespace driver UUID — matches hosAvail.driver_id and liveLocation.driver_id */
  tspDriverId: string | null;
  driverName: string;
  dutyStatus: string;
  driveAvailH: number | null;
  cycleAvailH: number | null;
  shiftAvailH: number | null;
  hoursUntilBreak: number | null;
  isInViolation: boolean;
  isNearLimit: boolean;
  /** Current GPS position from live location (sandbox simulator = Woodstock IL) */
  lat: number | null;
  lng: number | null;
  vehicleId: string | null;
  vehicleUnit: string | null;
  vehicleName: string | null;
  lastLocationAt: string | null;
  speedMph: number | null;
  odometerMi: number | null;
  engineHours: number | null;
  fuelPct: number | null;
  /** Trip origin from oldest HOS event for this vehicle */
  tripOrigin: TripPoint | null;
  /** Most recent driving location from latest HOS Driving event */
  lastDrivingPoint: TripPoint | null;
  /** Reverse-geocoded city/state of current GPS position */
  currentCity: string | null;
  /** Road context at current GPS position — only populated for drivers with Driving duty status */
  currentRoad: { roadName: string | null; classification: string | null; speedLimitMph: number | null } | null;
}

export interface HosEventItem {
  id: string;
  dutyStatusCode: string;
  dutyStatusLabel: string;
  startedAt: string;
  locationName: string | null;
  lat: number | null;
  lng: number | null;
  rulesetCode: string | null;
  odometer: number | null;
}

export interface SafetyEventItem {
  id: string;
  driverName: string;
  driverId: string;
  vehicleId: string;
  eventType: string;
  occurredAt: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  durationSeconds: number | null;
}

export interface DispatchSnapshot {
  fetchedAt: string;
  totalDrivers: number;
  driving: number;
  onDuty: number;
  offDuty: number;
  nearLimit: number;
  inViolation: number;
  driverStatuses: DriverHosStatus[];
  recentSafetyEvents: SafetyEventItem[];
  activeViolations: number;
}

export interface DriverDetail {
  driver: DriverHosStatus;
  allEventsForDriver: SafetyEventItem[];
  weather: { tempF: number | null; condition: string; windMph: number | null; visibilityMi: number | null } | null;
  roadContext: { roadName: string | null; classification: string | null; speedLimitMph: number | null } | null;
  currentCity: string | null;   // reverse-geocoded from current GPS
  hosEvents: HosEventItem[];
  todaySnapshot: {
    drivingSeconds: number;
    onDutySeconds: number;
    offDutySeconds: number;
    sleeperSeconds: number;
    snapshotDate: string;
  } | null;
  driverSummary: {
    safetyEvents30d: number;
    hosViolations30d: number;
    rulesetCode: string | null;
    licenseCountry: string | null;
    username: string | null;
    status: string | null;
  } | null;
  vehicle: {
    vin: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
    licensePlate: string | null;
    licenseRegion: string | null;
  } | null;
  dvirLogs: {
    id: string;
    inspectedAt: string;
    type: string;
    status: "satisfactory" | "unsatisfactory" | "unknown";
    defectCount: number;
  }[];
  hosViolationsList: {
    id: string;
    code: string | null;
    occurredAt: string;
    durationSeconds: number | null;
  }[];
  /** Recent GPS trail for this vehicle (time-ordered, last 24h). Origin is the
   *  first point, current is the last point — a real to/from derived from the
   *  telematics stream, not approximated from HOS duty-status events. */
  gpsTrail: { lat: number; lng: number; at: string; speedMph: number | null }[];
  tripOriginFromTrail: TripPoint | null;
  /** Straight-line distance from origin to current position, in miles. */
  trailDistanceMi: number | null;
  /** Engine on/off / ignition events from listEngineLogs (last 24h). */
  engineEvents: {
    id: string;
    eventType: string;
    occurredAt: string;
    locationName: string | null;
    odometerMi: number | null;
  }[];
  /** Per-vehicle analytics summary (30d) from listVehicleSummaries. */
  vehicleSummary: {
    safetyEvents30d: number | null;
    hosViolations30d: number | null;
    distanceMi30d: number | null;
    driveHours30d: number | null;
    fuelGallons30d: number | null;
  } | null;
  /** IFTA state-by-state mileage (best-effort; null if endpoint unavailable). */
  iftaSummary: { jurisdiction: string; distanceMi: number | null; fuelGallons: number | null }[];
  /** Sensor anomalies (harsh events, speeding spikes) per listVehicleSensorEvents (best-effort). */
  sensorEvents: {
    id: string;
    eventType: string;
    occurredAt: string;
    severity: string | null;
  }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

/** Extract {lat, lng} from GeoJSON Point — coordinates[0]=lng, coordinates[1]=lat */
function geoJsonLatLng(obj: unknown): { lat: number; lng: number } | null {
  if (!obj || typeof obj !== "object") return null;
  const loc = (obj as Record<string, unknown>).location;
  if (!loc || typeof loc !== "object") return null;
  const coords = (loc as Record<string, unknown>).coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

// HARDCODED for demo — the canonical source for these labels is Catena's
// reference endpoint `/v2/telematics/ref-hos-event-codes` (see COVERAGE.md).
// In production we would call it once at boot, cache the resulting code→label
// map, and use that instead of this inline switch. Hardcoding avoids the extra
// API round-trip on every dispatch render for a demo rehearsal.
function dutyStatusLabel(code: string | null): string {
  switch (code?.toUpperCase()) {
    case "D":   return "Driving";
    case "ON":  return "On duty";
    case "SB":  return "Sleeper";
    case "OFF": return "Off duty";
    case "PC":  return "Personal conveyance";
    case "YM":  return "Yard moves";
    case "INT": return "Intermediate";
    default:    return code ?? "Unknown";
  }
}

function formatTspName(raw: string | null): string | null {
  if (!raw) return null;
  // Format "ned.ryerson" or "user_abc123" into "Ned Ryerson"
  if (raw.startsWith("user_")) return null; // still synthetic
  return raw.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Find a specific vehicle's live-location row by paginating the live-locations
 * endpoint. The sandbox simulator returns a different ~100 rows per call, so a
 * single `size: 100` fetch can miss a vehicle that was on the dispatch board
 * seconds earlier. Paginates up to ~2500 rows (5 × 500) before giving up.
 */
async function findLiveLocationForVehicle(
  client: ReturnType<typeof createCatenaClientFromEnv>,
  vehicleId: string,
): Promise<{
  liveLoc: unknown | null;
  allLocations: unknown[];
}> {
  const allLocations: unknown[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const res = await client.listVehicleLiveLocations({ size: 500, cursor });
    const items = (res?.items ?? []) as unknown[];
    allLocations.push(...items);
    const hit = items.find((l) => str(l, "vehicle_id") === vehicleId);
    if (hit) return { liveLoc: hit, allLocations };
    const next = (res as { next_page?: string | null })?.next_page;
    if (typeof next !== "string" || next.length === 0) break;
    cursor = next;
  }
  return { liveLoc: null, allLocations };
}

/** Build a TripPoint from a HOS event record. `cityName` is filled in from
 * `inferred_address` on the event row if the API provides it, so the dispatch
 * board can skip reverse-geocoding. */
function hosEventToTripPoint(e: unknown): TripPoint | null {
  const coords = geoJsonLatLng(e);
  if (!coords) return null;
  const at = str(e, "started_at") ?? str(e, "occurred_at");
  if (!at) return null;
  return {
    ...coords,
    locationName: str(e, "location_name"),
    at,
    cityName: inferredCity(e),
  };
}

/** Best-effort "City, State" derived from a row's `inferred_address`. */
function inferredCity(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const addr = (obj as Record<string, unknown>).inferred_address as
    | Record<string, unknown>
    | null
    | undefined;
  if (!addr || typeof addr !== "object") return null;
  const city =
    typeof addr.city === "string"
      ? addr.city
      : typeof addr.locality === "string"
        ? addr.locality
        : null;
  const region =
    typeof addr.province === "string"
      ? addr.province
      : typeof addr.region === "string"
        ? addr.region
        : typeof addr.state === "string"
          ? addr.state
          : null;
  if (city && region) return `${city}, ${region}`;
  return city ?? region ?? null;
}

// ── Main action ──────────────────────────────────────────────────────────────

export async function fetchDispatchSnapshot(): Promise<DispatchSnapshot> {
  const client = createCatenaClientFromEnv();
  const fetchedAt = new Date().toISOString();

  // Primary: live locations are the authoritative driver list.
  // HOS avail driver_id === live location driver_id (TSP namespace).
  // Vehicle_id is the join key to safety events and HOS events.
  // Driver summaries supply first/last name for any driver the live-locations
  // stream reports as synthetic "user_xxxxxxxx" — turns ~half the board from
  // "Driver abcd1234" placeholders into real names without extra calls.
  const [liveLocRes, hosAvailRes, hosViolRes, safetyRes, hosEvtRes, driverSummRes] =
    await Promise.all([
      client.listVehicleLiveLocations({ size: 100 }),
      client.listHosAvailabilities({ size: 100 }),
      client.listHosViolations({ size: 200 }),
      client.listDriverSafetyEvents({ size: 100 }),
      client.listHosEvents({ size: 200 }).catch(() => null),
      client.listDriverSummaries({ size: 200 }).catch(() => null),
    ]);

  const liveLocations = (liveLocRes?.items ?? []) as unknown[];

  // If the pinned demo driver(s) aren't in the first page, paginate until
  // found. The sandbox returns a shifting ~100-row subset per call, so the
  // overlay driver otherwise disappears from the board depending on where
  // she lands in the stream at query time.
  const demoIds = Object.keys(DEMO_DRIVER_NAME_OVERRIDES);
  const presentIds = new Set(
    liveLocations.map((l) => str(l, "driver_id")).filter(Boolean),
  );
  const missingDemoIds = demoIds.filter((id) => !presentIds.has(id));
  if (missingDemoIds.length > 0) {
    let cursor =
      typeof (liveLocRes as { next_page?: string | null } | null | undefined)?.next_page ===
        "string" && (liveLocRes as { next_page?: string }).next_page!.length > 0
        ? (liveLocRes as { next_page: string }).next_page
        : undefined;
    const stillMissing = new Set(missingDemoIds);
    for (let page = 0; page < 5 && stillMissing.size > 0 && cursor; page++) {
      const res = await client
        .listVehicleLiveLocations({ size: 500, cursor })
        .catch(() => null);
      const items = (res?.items ?? []) as unknown[];
      for (const row of items) {
        const did = str(row, "driver_id");
        if (did && stillMissing.has(did)) {
          liveLocations.push(row);
          stillMissing.delete(did);
        }
      }
      const next = (res as { next_page?: string | null } | null)?.next_page;
      cursor = typeof next === "string" && next.length > 0 ? next : undefined;
    }
  }
  const hosAvails = (hosAvailRes?.items ?? []) as unknown[];
  const hosViolations = (hosViolRes?.items ?? []) as unknown[];
  const safetyEvents = (safetyRes?.items ?? []) as unknown[];
  const hosEvents = ((hosEvtRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const driverSummaries =
    ((driverSummRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];

  // Index driver summaries by TSP driver_id (user_id == live_loc.driver_id).
  // Used to resolve real first/last names for "user_..." placeholder entries.
  const summaryByTspId = new Map<string, unknown>();
  for (const s of driverSummaries) {
    const uid = str(s, "user_id");
    if (uid) summaryByTspId.set(uid, s);
  }
  const resolveDriverName = (
    tspDriverId: string,
    rawLiveLocName: string | null,
  ): string | null => {
    const fromLive = formatTspName(rawLiveLocName);
    if (fromLive) return fromLive;
    // Single-driver demo overlay — pins a human name to one real sandbox
    // driver_id so presentations always have at least one fully-named hero
    // card. Data for this driver is still 100% live from Catena.
    const overlay = demoDriverNameFor(tspDriverId);
    if (overlay) return overlay;
    const summary = summaryByTspId.get(tspDriverId);
    if (summary) {
      const first = str(summary, "first_name");
      const last = str(summary, "last_name");
      const isSynthetic = !first || first.startsWith("Driver_") || first.startsWith("driver_");
      if (!isSynthetic && first && last) return `${first} ${last}`;
      if (!isSynthetic && first) return first;
      const username = str(summary, "username");
      if (username && !username.startsWith("user_")) {
        return username.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
    return null;
  };

  // Index HOS avails by TSP driver_id (same as their id)
  const hosAvailByTspId = new Map<string, unknown>();
  for (const h of hosAvails) {
    const did = str(h, "driver_id") ?? str(h, "id");
    if (did) hosAvailByTspId.set(did, h);
  }

  // Index safety events by vehicle_id for fast lookup
  const safetyByVehicle = new Map<string, unknown[]>();
  for (const e of safetyEvents) {
    const vid = str(e, "vehicle_id");
    if (!vid) continue;
    if (!safetyByVehicle.has(vid)) safetyByVehicle.set(vid, []);
    safetyByVehicle.get(vid)!.push(e);
  }

  // Index HOS events by vehicle_id and compute trip origin + last driving point per vehicle
  const tripOriginByVehicle = new Map<string, TripPoint>();
  const lastDrivingByVehicle = new Map<string, TripPoint>();
  for (const e of hosEvents) {
    const vid = str(e, "vehicle_id");
    if (!vid) continue;
    const pt = hosEventToTripPoint(e);
    if (!pt) continue;
    const startedAt = str(e, "started_at") ?? "";
    // Oldest event with location = trip origin
    const existing = tripOriginByVehicle.get(vid);
    if (!existing || startedAt < existing.at) tripOriginByVehicle.set(vid, pt);
    // Latest Driving event = last known driving location
    const code = str(e, "duty_status_code") ?? str(e, "event_code") ?? "";
    if (code.toUpperCase() === "D" || code.toUpperCase() === "DRIVING") {
      const cur = lastDrivingByVehicle.get(vid);
      if (!cur || startedAt > cur.at) lastDrivingByVehicle.set(vid, pt);
    }
  }

  // Violation set: recent HOS violations (24h window)
  const recentViolDriverIds = new Set<string>(
    hosViolations
      .filter((v) => {
        const at = str(v, "occurred_at");
        return at ? Date.now() - new Date(at).getTime() < 24 * 3600_000 : false;
      })
      .map((v) => str(v, "driver_id") ?? "")
      .filter(Boolean),
  );

  // Build driver status from live locations. Filter to a STABLE, NAMED set:
  // only include drivers whose identity resolves to a real human name from at
  // least one source (live-location driver_name, demo overlay, or
  // driver_summary first/last). This drops synthetic "Driver abcd1234"
  // placeholders that otherwise cycle across page loads as the simulator
  // shuffles its live-location stream.
  const driverStatuses: DriverHosStatus[] = [];
  const seenTspIds = new Set<string>();
  for (const liveLoc of liveLocations) {
    const vehicleId = str(liveLoc, "vehicle_id");
    if (!vehicleId) continue;

    const tspDriverId = str(liveLoc, "driver_id");
    if (!tspDriverId) continue;
    if (seenTspIds.has(tspDriverId)) continue;

    const rawName = str(liveLoc, "driver_name");
    const driverName = resolveDriverName(tspDriverId, rawName);
    if (!driverName) continue;
    seenTspIds.add(tspDriverId);
    const hos = hosAvailByTspId.get(tspDriverId) ?? null;
    const vehicleName = str(liveLoc, "vehicle_name");
    const vehicleUnit = vehicleName ?? vehicleId.slice(0, 8);
    const dutyCode = str(hos, "duty_status_code"); // null → "Unknown" (no HOS match)
    const driveAvailSec = num(hos, "available_drive_seconds");
    const cycleAvailSec = num(hos, "available_cycle_seconds");
    const shiftAvailSec = num(hos, "available_shift_seconds");
    const breakSec = num(hos, "time_until_break_seconds");
    const driveAvailH = driveAvailSec != null ? Math.round((driveAvailSec / 3600) * 10) / 10 : null;
    const cycleAvailH = cycleAvailSec != null ? Math.round((cycleAvailSec / 3600) * 10) / 10 : null;
    const shiftAvailH = shiftAvailSec != null ? Math.round((shiftAvailSec / 3600) * 10) / 10 : null;
    const hoursUntilBreak = breakSec != null ? Math.round((breakSec / 3600) * 10) / 10 : null;
    const isNearLimit = (driveAvailH != null && driveAvailH <= 1.5) || (cycleAvailH != null && cycleAvailH <= 2.0);
    const isInViolation = recentViolDriverIds.has(tspDriverId ?? "") ||
      (driveAvailH != null && driveAvailH < 0) ||
      (cycleAvailH != null && cycleAvailH < 0);

    // Current GPS from live location
    const coords = geoJsonLatLng(liveLoc);
    const lat = coords?.lat ?? null;
    const lng = coords?.lng ?? null;
    const lastLocationAt = str(liveLoc, "occurred_at") ?? null;

    // Live telemetry
    const speedMph = num(liveLoc, "speed");
    const rawOdometer = num(liveLoc, "odometer");
    const odometerMi = rawOdometer != null ? Math.round(rawOdometer / 1609.344) : null;
    const engineHours = num(liveLoc, "engine_hours");
    const fuelPct = num(liveLoc, "fuel_level");

    driverStatuses.push({
      driverId: vehicleId,   // vehicle_id is the URL key
      tspDriverId,
      driverName,
      dutyStatus: dutyStatusLabel(dutyCode),
      driveAvailH,
      cycleAvailH,
      shiftAvailH,
      hoursUntilBreak,
      isInViolation,
      isNearLimit,
      lat,
      lng,
      vehicleId,
      vehicleUnit,
      vehicleName,
      lastLocationAt,
      speedMph,
      odometerMi,
      engineHours,
      fuelPct,
      tripOrigin: tripOriginByVehicle.get(vehicleId) ?? null,
      lastDrivingPoint: lastDrivingByVehicle.get(vehicleId) ?? null,
      // Use the API-provided `inferred_address` when present — avoids 100+
      // Nominatim round-trips per page load. The driver detail page does live
      // reverse-geocoding on click for richer context.
      currentCity: inferredCity(liveLoc),
      currentRoad: null,
    });
  }

  // Recent safety events (last 24h)
  const cutoff = Date.now() - 24 * 3600_000;
  const recentSafetyEvents: SafetyEventItem[] = safetyEvents
    .filter((e) => {
      const at = str(e, "occurred_at");
      return at ? new Date(at).getTime() >= cutoff : false;
    })
    .slice(0, 25)
    .map((e) => {
      const vid = str(e, "vehicle_id") ?? "";
      const rawAddr = (e as Record<string, unknown>).inferred_address as Record<string, unknown> | null;
      const city = str(rawAddr, "city");
      const state = str(rawAddr, "province");
      const location = city && state ? `${city}, ${state}` : city ?? state ?? null;
      return {
        id: str(e, "id") ?? `evt-${Math.random()}`,
        driverName: vid.slice(0, 8),
        driverId: vid,
        vehicleId: vid,
        eventType: (str(e, "event") ?? "unknown").replace(/_/g, " "),
        occurredAt: str(e, "occurred_at") ?? new Date().toISOString(),
        location,
        lat: null,
        lng: null,
        durationSeconds: num(e, "duration_seconds"),
      };
    });

  // Geocoding is intentionally skipped on the dispatch board — it's 20+ Nominatim
  // calls per load that add 5–10s of latency. The driver detail page geocodes
  // the trip points when the user actually clicks in. Cards show raw coords.

  const statusCounts = { driving: 0, onDuty: 0, offDuty: 0 };
  for (const d of driverStatuses) {
    const s = d.dutyStatus.toLowerCase();
    if (s === "driving") statusCounts.driving++;
    else if (s.startsWith("on duty") || s === "yard moves") statusCounts.onDuty++;
    else statusCounts.offDuty++;
  }

  return {
    fetchedAt,
    totalDrivers: driverStatuses.length,
    driving: statusCounts.driving,
    onDuty: statusCounts.onDuty,
    offDuty: statusCounts.offDuty,
    nearLimit: driverStatuses.filter((d) => d.isNearLimit && !d.isInViolation).length,
    inViolation: driverStatuses.filter((d) => d.isInViolation).length,
    driverStatuses: driverStatuses.sort((a, b) => {
      if (a.isInViolation !== b.isInViolation) return a.isInViolation ? -1 : 1;
      if (a.isNearLimit !== b.isNearLimit) return a.isNearLimit ? -1 : 1;
      const rank = (d: DriverHosStatus) => {
        const s = d.dutyStatus.toLowerCase();
        if (s === "driving") return 0;
        if (s.startsWith("on duty") || s === "yard moves") return 1;
        if (s === "sleeper") return 2;
        if (s === "personal conveyance") return 3;
        return 4;
      };
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return a.driverName.localeCompare(b.driverName);
    }),
    recentSafetyEvents,
    activeViolations: hosViolations.filter((v) => {
      const at = str(v, "occurred_at");
      return at ? Date.now() - new Date(at).getTime() < 24 * 3600_000 : false;
    }).length,
  };
}

// ── Driver detail action ─────────────────────────────────────────────────────

/** vehicleId is the vehicle_id from the live location (used as URL key) */
export async function fetchDriverDetail(vehicleId: string): Promise<DriverDetail | null> {
  const client = createCatenaClientFromEnv();

  // Paginate live-locations until we find this vehicle (sandbox returns a
  // shifting subset per call). Run in parallel with the rest of the fetches.
  const liveLocLookupPromise = findLiveLocationForVehicle(client, vehicleId);

  const [
    liveLocLookup,
    hosAvailRes,
    hosViolRes,
    safetyRes,
    hosEvtRes,
    hosSnapRes,
    driverSummRes,
    vehiclesRes,
    dvirRes,
    vehLocRes,
    engineLogRes,
    vehSummRes,
    iftaRes,
    sensorRes,
  ] = await Promise.all([
    liveLocLookupPromise,
    client.listHosAvailabilities({ size: 100 }),
    client.listHosViolations({ size: 200 }),
    client.listDriverSafetyEvents({ size: 200 }),
    client.listHosEvents({ size: 200 }).catch(() => null),
    client.listHosDailySnapshots({ size: 50 }).catch(() => null),
    client.listDriverSummaries({ size: 100 }).catch(() => null),
    client.listVehicles({ size: 200 }).catch(() => null),
    client.listDvirLogs({ size: 100 }).catch(() => null),
    // Additional per-driver enrichment — each is best-effort. Sandbox may 5xx
    // on some of these (COVERAGE.md notes vehicle-locations / ifta / sensor
    // events can return ERROR); callers render "—" in that case.
    client
      .listVehicleLocations({
        size: 500,
        from_datetime: new Date(Date.now() - 24 * 3600_000).toISOString(),
        to_datetime: new Date().toISOString(),
      })
      .catch(() => null),
    client
      .listEngineLogs({
        size: 200,
        from_datetime: new Date(Date.now() - 24 * 3600_000).toISOString(),
        to_datetime: new Date().toISOString(),
      })
      .catch(() => null),
    client.listVehicleSummaries({ size: 200 }).catch(() => null),
    client.listIftaSummaries({ size: 50 }).catch(() => null),
    client.listVehicleSensorEvents({ size: 200 }).catch(() => null),
  ]);

  const hosAvails = (hosAvailRes?.items ?? []) as unknown[];
  const hosViolations = (hosViolRes?.items ?? []) as unknown[];
  const safetyEvents = (safetyRes?.items ?? []) as unknown[];
  const hosEventsRaw = ((hosEvtRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const hosSnapshotsRaw = ((hosSnapRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const driverSummariesRaw = ((driverSummRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const vehiclesRaw = ((vehiclesRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const dvirRaw = ((dvirRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const vehLocRaw = ((vehLocRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const engineLogRaw = ((engineLogRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const vehSummRaw = ((vehSummRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const iftaRaw = ((iftaRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const sensorRaw = ((sensorRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];

  // Use the live-loc returned by the paginated lookup (already scanned up to
  // ~2500 rows of the sandbox stream). If still null, the vehicle genuinely
  // has no live-location row right now.
  const liveLoc = liveLocLookup.liveLoc;
  if (!liveLoc) return null;

  const tspDriverId = str(liveLoc, "driver_id");
  const rawName = str(liveLoc, "driver_name");
  const driverName = formatTspName(rawName) ?? `Vehicle ${vehicleId.slice(0, 8)}`;
  const vehicleName = str(liveLoc, "vehicle_name");
  const vehicleUnit = vehicleName ?? vehicleId.slice(0, 8);

  // Match HOS availability by TSP driver_id
  const hosAvailByTspId = new Map<string, unknown>();
  for (const h of hosAvails) {
    const did = str(h, "driver_id") ?? str(h, "id");
    if (did) hosAvailByTspId.set(did, h);
  }
  const hos = tspDriverId ? (hosAvailByTspId.get(tspDriverId) ?? null) : (hosAvails[0] ?? null);

  const recentViolDriverIds = new Set<string>(
    hosViolations
      .filter((v) => {
        const at = str(v, "occurred_at");
        return at ? Date.now() - new Date(at).getTime() < 24 * 3600_000 : false;
      })
      .map((v) => str(v, "driver_id") ?? "").filter(Boolean),
  );

  const dutyCode = str(hos, "duty_status_code") ?? "OFF";
  const driveAvailSec = num(hos, "available_drive_seconds");
  const cycleAvailSec = num(hos, "available_cycle_seconds");
  const shiftAvailSec = num(hos, "available_shift_seconds");
  const breakSec = num(hos, "time_until_break_seconds");
  const driveAvailH = driveAvailSec != null ? Math.round((driveAvailSec / 3600) * 10) / 10 : null;
  const cycleAvailH = cycleAvailSec != null ? Math.round((cycleAvailSec / 3600) * 10) / 10 : null;
  const shiftAvailH = shiftAvailSec != null ? Math.round((shiftAvailSec / 3600) * 10) / 10 : null;
  const hoursUntilBreak = breakSec != null ? Math.round((breakSec / 3600) * 10) / 10 : null;
  const isNearLimit = (driveAvailH != null && driveAvailH <= 1.5) || (cycleAvailH != null && cycleAvailH <= 2.0);
  const isInViolation = recentViolDriverIds.has(tspDriverId ?? "") ||
    (driveAvailH != null && driveAvailH < 0) ||
    (cycleAvailH != null && cycleAvailH < 0);

  const coords = geoJsonLatLng(liveLoc);
  const lat = coords?.lat ?? null;
  const lng = coords?.lng ?? null;
  const lastLocationAt = str(liveLoc, "occurred_at") ?? null;
  const speedMph = num(liveLoc, "speed");
  const rawOdometer = num(liveLoc, "odometer");
  const odometerMi = rawOdometer != null ? Math.round(rawOdometer / 1609.344) : null;
  const engineHours = num(liveLoc, "engine_hours");
  const fuelPct = num(liveLoc, "fuel_level");

  // HOS events for this vehicle
  const vehicleHosEvents = hosEventsRaw.filter((e) => str(e, "vehicle_id") === vehicleId);

  // Compute trip origin and last driving point from HOS events
  let tripOrigin: TripPoint | null = null;
  let lastDrivingPoint: TripPoint | null = null;
  for (const e of vehicleHosEvents) {
    const pt = hosEventToTripPoint(e);
    if (!pt) continue;
    if (!tripOrigin || pt.at < tripOrigin.at) tripOrigin = pt;
    const code = str(e, "duty_status_code") ?? str(e, "event_code") ?? "";
    if (code.toUpperCase() === "D" || code.toUpperCase() === "DRIVING") {
      if (!lastDrivingPoint || pt.at > lastDrivingPoint.at) lastDrivingPoint = pt;
    }
  }

  // Geocode trip points before constructing driver object
  const [originCity, drivingCity] = await Promise.all([
    tripOrigin ? reverseGeocode(tripOrigin.lat, tripOrigin.lng).catch(() => null) : Promise.resolve(null),
    lastDrivingPoint ? reverseGeocode(lastDrivingPoint.lat, lastDrivingPoint.lng).catch(() => null) : Promise.resolve(null),
  ]);
  if (tripOrigin) tripOrigin = { ...tripOrigin, cityName: originCity };
  if (lastDrivingPoint) lastDrivingPoint = { ...lastDrivingPoint, cityName: drivingCity };

  const driver: DriverHosStatus = {
    driverId: vehicleId,
    tspDriverId,
    driverName,
    dutyStatus: dutyStatusLabel(dutyCode),
    driveAvailH,
    cycleAvailH,
    shiftAvailH,
    hoursUntilBreak,
    isInViolation,
    isNearLimit,
    lat,
    lng,
    vehicleId,
    vehicleUnit,
    vehicleName,
    lastLocationAt,
    speedMph,
    odometerMi,
    engineHours,
    fuelPct,
    tripOrigin,
    lastDrivingPoint,
    currentCity: null,   // populated after this block (shared with dispatch flow)
    currentRoad: null,
  };

  // Safety events for this vehicle
  const allEventsForDriver: SafetyEventItem[] = safetyEvents
    .filter((e) => str(e, "vehicle_id") === vehicleId)
    .map((e) => {
      const rawAddr = (e as Record<string, unknown>).inferred_address as Record<string, unknown> | null;
      const city = str(rawAddr, "city");
      const state = str(rawAddr, "province");
      const location = city && state ? `${city}, ${state}` : city ?? state ?? null;
      return {
        id: str(e, "id") ?? `evt-${Math.random()}`,
        driverName,
        driverId: vehicleId,
        vehicleId,
        eventType: (str(e, "event") ?? "unknown").replace(/_/g, " "),
        occurredAt: str(e, "occurred_at") ?? new Date().toISOString(),
        location,
        lat: null,
        lng: null,
        durationSeconds: num(e, "duration_seconds"),
      };
    });

  // HOS event timeline (newest first)
  const hosEvents: HosEventItem[] = vehicleHosEvents
    .sort((a, b) => (str(b, "started_at") ?? "").localeCompare(str(a, "started_at") ?? ""))
    .slice(0, 20)
    .map((e) => {
      const evtCoords = geoJsonLatLng(e);
      const code = str(e, "duty_status_code") ?? str(e, "event_code") ?? "?";
      return {
        id: str(e, "id") ?? `evt-${Math.random()}`,
        dutyStatusCode: code,
        dutyStatusLabel: dutyStatusLabel(code),
        startedAt: str(e, "started_at") ?? str(e, "occurred_at") ?? new Date().toISOString(),
        locationName: str(e, "location_name"),
        lat: evtCoords?.lat ?? null,
        lng: evtCoords?.lng ?? null,
        rulesetCode: str(e, "hos_ruleset_code"),
        odometer: num(e, "odometer"),
      };
    });

  // Daily snapshot — match by TSP driver_id (same namespace as HOS avail)
  const snapshotsForDriver = hosSnapshotsRaw.filter(
    (s) => tspDriverId && str(s, "driver_id") === tspDriverId
  );
  const todaySnap = snapshotsForDriver
    .sort((a, b) => (str(b, "snapshot_date") ?? "").localeCompare(str(a, "snapshot_date") ?? ""))
    [0] ?? null;

  const todaySnapshot = todaySnap ? {
    drivingSeconds: num(todaySnap, "duration_driving_seconds") ?? 0,
    onDutySeconds: num(todaySnap, "duration_on_duty_seconds") ?? 0,
    offDutySeconds: num(todaySnap, "duration_off_duty_seconds") ?? 0,
    sleeperSeconds: num(todaySnap, "duration_sleeper_berth_seconds") ?? 0,
    snapshotDate: str(todaySnap, "snapshot_date") ?? "",
  } : null;

  // Driver summary — user_id may match TSP driver_id for some TSPs
  const summaryRec = driverSummariesRaw.find(
    (s) => tspDriverId && str(s, "user_id") === tspDriverId
  ) ?? null;
  const driverSummary = summaryRec ? {
    safetyEvents30d: num(summaryRec, "safety_events_30d") ?? 0,
    hosViolations30d: num(summaryRec, "hos_violations_30d") ?? 0,
    rulesetCode: str(summaryRec, "hos_ruleset_code"),
    licenseCountry: str(summaryRec, "license_country"),
    username: str(summaryRec, "username"),
    status: str(summaryRec, "status"),
  } : null;

  // Vehicle record — full details (VIN, make, model, year, plate)
  const vehicleRec = vehiclesRaw.find((v) => str(v, "id") === vehicleId);
  const vehicleInfo = vehicleRec ? {
    vin: str(vehicleRec, "vin"),
    make: str(vehicleRec, "make"),
    model: str(vehicleRec, "model"),
    year: num(vehicleRec, "year"),
    licensePlate: str(vehicleRec, "license_plate"),
    licenseRegion: str(vehicleRec, "license_region") ?? str(vehicleRec, "license_plate_region"),
  } : null;

  // DVIR inspection history for this vehicle (last 60 days)
  const sixtyDaysAgo = Date.now() - 60 * 24 * 3600_000;
  const dvirLogs: DriverDetail["dvirLogs"] = dvirRaw
    .filter((l) => str(l, "vehicle_id") === vehicleId)
    .filter((l) => {
      const at = str(l, "occurred_at");
      return at ? new Date(at).getTime() >= sixtyDaysAgo : false;
    })
    .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""))
    .slice(0, 20)
    .map((l) => {
      const defectCount = num(l, "defect_count") ?? 0;
      const isCritical = (l as Record<string, unknown>).is_safety_critical === true;
      const hasDefects = defectCount > 0 || isCritical;
      return {
        id: str(l, "id") ?? "",
        inspectedAt: str(l, "occurred_at") ?? "",
        type: (str(l, "log_type") ?? "inspection").replace(/_/g, " "),
        status: hasDefects ? "unsatisfactory" as const : "satisfactory" as const,
        defectCount,
      };
    });

  // GPS trail for this vehicle (last 24h, time-ordered oldest → newest).
  // Provides a real trip origin + current position, not just inferred from
  // HOS duty-status transitions.
  const gpsTrail: DriverDetail["gpsTrail"] = vehLocRaw
    .filter((r) => str(r, "vehicle_id") === vehicleId)
    .map((r) => {
      const c = geoJsonLatLng(r);
      const at = str(r, "occurred_at");
      if (!c || !at) return null;
      const rawSpeed = num(r, "speed");
      const speedMph =
        rawSpeed != null ? Math.round(rawSpeed * 2.23694 * 10) / 10 : null;
      return { lat: c.lat, lng: c.lng, at, speedMph };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 100);

  let tripOriginFromTrail: TripPoint | null = null;
  if (gpsTrail.length > 0) {
    const first = gpsTrail[0];
    const originCity = await reverseGeocode(first.lat, first.lng).catch(() => null);
    tripOriginFromTrail = {
      lat: first.lat,
      lng: first.lng,
      locationName: null,
      at: first.at,
      cityName: originCity,
    };
  }

  // Straight-line distance between trail origin and current position (miles).
  // Approximation — not the road distance. Useful as a rough "how far traveled."
  let trailDistanceMi: number | null = null;
  if (tripOriginFromTrail && lat != null && lng != null) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 3958.8;
    const dLat = toRad(lat - tripOriginFromTrail.lat);
    const dLng = toRad(lng - tripOriginFromTrail.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(tripOriginFromTrail.lat)) *
        Math.cos(toRad(lat)) *
        Math.sin(dLng / 2) ** 2;
    trailDistanceMi = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  }

  // Engine on/off / ignition events for this vehicle (last 24h).
  const engineEvents: DriverDetail["engineEvents"] = engineLogRaw
    .filter((e) => str(e, "vehicle_id") === vehicleId)
    .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""))
    .slice(0, 20)
    .map((e) => {
      const rawOd = num(e, "odometer");
      return {
        id: str(e, "id") ?? `eng-${Math.random()}`,
        eventType: (str(e, "event") ?? str(e, "event_type") ?? "event").replace(/_/g, " "),
        occurredAt: str(e, "occurred_at") ?? "",
        locationName: str(e, "location_name"),
        odometerMi: rawOd != null ? Math.round(rawOd / 1609.344) : null,
      };
    });

  // Per-vehicle analytics summary (30d rollup).
  const vehSummRec = vehSummRaw.find(
    (v) => str(v, "vehicle_id") === vehicleId || str(v, "id") === vehicleId,
  );
  const vehicleSummary: DriverDetail["vehicleSummary"] = vehSummRec
    ? {
        safetyEvents30d:
          num(vehSummRec, "safety_events_30d") ?? num(vehSummRec, "safety_events"),
        hosViolations30d:
          num(vehSummRec, "hos_violations_30d") ?? num(vehSummRec, "hos_violations"),
        distanceMi30d: (() => {
          const m = num(vehSummRec, "distance_meters_30d") ?? num(vehSummRec, "distance_meters");
          return m != null ? Math.round(m / 1609.344) : null;
        })(),
        driveHours30d: (() => {
          const s = num(vehSummRec, "drive_seconds_30d") ?? num(vehSummRec, "drive_seconds");
          return s != null ? Math.round((s / 3600) * 10) / 10 : null;
        })(),
        fuelGallons30d:
          num(vehSummRec, "fuel_gallons_30d") ?? num(vehSummRec, "fuel_gallons"),
      }
    : null;

  // IFTA jurisdiction summary for this vehicle (state-by-state mileage).
  const iftaSummary: DriverDetail["iftaSummary"] = iftaRaw
    .filter((r) => str(r, "vehicle_id") === vehicleId)
    .slice(0, 20)
    .map((r) => {
      const distM = num(r, "distance_meters");
      return {
        jurisdiction:
          str(r, "jurisdiction") ?? str(r, "state") ?? str(r, "province") ?? "—",
        distanceMi: distM != null ? Math.round(distM / 1609.344) : null,
        fuelGallons: num(r, "fuel_gallons"),
      };
    });

  // Sensor anomalies (harsh events, speeding spikes, etc.).
  const sensorEvents: DriverDetail["sensorEvents"] = sensorRaw
    .filter((e) => str(e, "vehicle_id") === vehicleId)
    .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""))
    .slice(0, 20)
    .map((e) => ({
      id: str(e, "id") ?? `sens-${Math.random()}`,
      eventType: (str(e, "event") ?? str(e, "event_type") ?? "sensor").replace(/_/g, " "),
      occurredAt: str(e, "occurred_at") ?? "",
      severity: str(e, "severity"),
    }));

  // HOS violations history for this driver (last 30 days)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600_000;
  const hosViolationsList: DriverDetail["hosViolationsList"] = tspDriverId
    ? hosViolations
        .filter((v) => str(v, "driver_id") === tspDriverId)
        .filter((v) => {
          const at = str(v, "occurred_at");
          return at ? new Date(at).getTime() >= thirtyDaysAgo : false;
        })
        .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""))
        .slice(0, 15)
        .map((v) => ({
          id: str(v, "id") ?? "",
          code: str(v, "violation_code") ?? str(v, "rule_code"),
          occurredAt: str(v, "occurred_at") ?? "",
          durationSeconds: num(v, "duration_seconds"),
        }))
    : [];

  // Weather + road context + current-location city at current GPS position
  let weather: DriverDetail["weather"] = null;
  let roadContext: DriverDetail["roadContext"] = null;
  let currentCity: string | null = null;

  if (lat != null && lng != null) {
    const now = new Date().toISOString();
    // Hard 2.5s budget for external enrichment so page loads stay under 5s.
    // If any source times out we just show "unavailable" — results cache on success.
    const budgetMs = 2500;
    const withBudget = <T>(p: Promise<T>): Promise<T | null> =>
      Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), budgetMs))]);
    const [wx, road, city] = await Promise.all([
      withBudget(fetchWeatherAtIncident(lat, lng, now).catch(() => null)),
      withBudget(fetchRoadContext(lat, lng, null).catch(() => null)),
      withBudget(reverseGeocode(lat, lng).catch(() => null)),
    ]);

    if (wx) {
      weather = {
        tempF: wx.temperatureF,
        condition: wx.conditionDescription ?? "NOAA data unavailable",
        windMph: wx.windSpeedMph ?? null,
        visibilityMi: wx.visibilityMiles ?? null,
      };
    }
    if (road) {
      roadContext = {
        roadName: road.roadName ?? null,
        classification: road.roadClassification ?? null,
        speedLimitMph: road.postedSpeedLimitMph ?? null,
      };
    }
    currentCity = city;
    // Mirror into driver record so board card and detail stay consistent.
    driver.currentCity = city;
    if (roadContext) driver.currentRoad = roadContext;
  }

  return {
    driver,
    allEventsForDriver,
    weather,
    roadContext,
    currentCity,
    hosEvents,
    todaySnapshot,
    driverSummary,
    vehicle: vehicleInfo,
    dvirLogs,
    hosViolationsList,
    gpsTrail,
    tripOriginFromTrail,
    trailDistanceMi,
    engineEvents,
    vehicleSummary,
    iftaSummary,
    sensorEvents,
  };
}
