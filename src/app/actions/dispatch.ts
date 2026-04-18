"use server";

import { createCatenaClientFromEnv } from "@/lib/catena/client";
import { fetchWeatherAtIncident } from "@/lib/enrichment/weather";
import { fetchRoadContext, reverseGeocode } from "@/lib/enrichment/roads";

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

/** Build a TripPoint from a HOS event record (cityName filled in later) */
function hosEventToTripPoint(e: unknown): TripPoint | null {
  const coords = geoJsonLatLng(e);
  if (!coords) return null;
  const at = str(e, "started_at") ?? str(e, "occurred_at");
  if (!at) return null;
  return { ...coords, locationName: str(e, "location_name"), at, cityName: null };
}

// ── Main action ──────────────────────────────────────────────────────────────

export async function fetchDispatchSnapshot(): Promise<DispatchSnapshot> {
  const client = createCatenaClientFromEnv();
  const fetchedAt = new Date().toISOString();

  // Primary: live locations are the authoritative driver list.
  // HOS avail driver_id === live location driver_id (TSP namespace).
  // Vehicle_id is the join key to safety events and HOS events.
  const [liveLocRes, hosAvailRes, hosViolRes, safetyRes, hosEvtRes] = await Promise.all([
    client.listVehicleLiveLocations({ size: 100 }),
    client.listHosAvailabilities({ size: 100 }),
    client.listHosViolations({ size: 200 }),
    client.listDriverSafetyEvents({ size: 100 }),
    client.listHosEvents({ size: 200 }).catch(() => null),
  ]);

  const liveLocations = (liveLocRes?.items ?? []) as unknown[];
  const hosAvails = (hosAvailRes?.items ?? []) as unknown[];
  const hosViolations = (hosViolRes?.items ?? []) as unknown[];
  const safetyEvents = (safetyRes?.items ?? []) as unknown[];
  const hosEvents = ((hosEvtRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];

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

  // Build driver status from live locations. We show any vehicle with meaningful data:
  //   - Real TSP driver name (e.g. "ned.ryerson") — means a named driver is assigned
  //   - Matching HOS availability — means we have live duty-status data
  //   - Matching HOS events — means we have trip history
  // Vehicles with none of these are just pings with no driver context — skip them.
  const driverStatuses: DriverHosStatus[] = [];
  for (const liveLoc of liveLocations) {
    const vehicleId = str(liveLoc, "vehicle_id");
    if (!vehicleId) continue;

    const tspDriverId = str(liveLoc, "driver_id");
    if (!tspDriverId) continue;

    const rawName = str(liveLoc, "driver_name");
    const hasRealName = !!rawName && !rawName.startsWith("user_");
    const hos = hosAvailByTspId.get(tspDriverId) ?? null;
    const hasTripHistory = tripOriginByVehicle.has(vehicleId);
    if (!hasRealName && !hos && !hasTripHistory) continue;

    const driverName = formatTspName(rawName) ?? `Driver ${tspDriverId.slice(0, 8)}`;
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

  // Geocode trip origins for board cards (only a few vehicles will have trip points)
  const tripPointsToGeocode: { driverId: string; type: "origin" | "driving"; lat: number; lng: number }[] = [];
  for (const d of driverStatuses) {
    if (d.tripOrigin) tripPointsToGeocode.push({ driverId: d.driverId, type: "origin", lat: d.tripOrigin.lat, lng: d.tripOrigin.lng });
    if (d.lastDrivingPoint) tripPointsToGeocode.push({ driverId: d.driverId, type: "driving", lat: d.lastDrivingPoint.lat, lng: d.lastDrivingPoint.lng });
  }
  if (tripPointsToGeocode.length > 0) {
    const geocoded = await Promise.all(
      tripPointsToGeocode.map((p) => reverseGeocode(p.lat, p.lng).catch(() => null))
    );
    for (let i = 0; i < tripPointsToGeocode.length; i++) {
      const { driverId, type } = tripPointsToGeocode[i]!;
      const city = geocoded[i] ?? null;
      const d = driverStatuses.find((s) => s.driverId === driverId);
      if (!d) continue;
      if (type === "origin" && d.tripOrigin) d.tripOrigin = { ...d.tripOrigin, cityName: city };
      if (type === "driving" && d.lastDrivingPoint) d.lastDrivingPoint = { ...d.lastDrivingPoint, cityName: city };
    }
  }

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

  const [liveLocRes, hosAvailRes, hosViolRes, safetyRes, hosEvtRes, hosSnapRes, driverSummRes] = await Promise.all([
    client.listVehicleLiveLocations({ size: 100 }),
    client.listHosAvailabilities({ size: 100 }),
    client.listHosViolations({ size: 200 }),
    client.listDriverSafetyEvents({ size: 200 }),
    client.listHosEvents({ size: 200 }).catch(() => null),
    client.listHosDailySnapshots({ size: 50 }).catch(() => null),
    client.listDriverSummaries({ size: 100 }).catch(() => null),
  ]);

  const liveLocations = (liveLocRes?.items ?? []) as unknown[];
  const hosAvails = (hosAvailRes?.items ?? []) as unknown[];
  const hosViolations = (hosViolRes?.items ?? []) as unknown[];
  const safetyEvents = (safetyRes?.items ?? []) as unknown[];
  const hosEventsRaw = ((hosEvtRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const hosSnapshotsRaw = ((hosSnapRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const driverSummariesRaw = ((driverSummRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];

  // Find this vehicle's live location
  const liveLoc = liveLocations.find((loc) => str(loc, "vehicle_id") === vehicleId);
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

  // Weather + road context at current GPS position
  let weather: DriverDetail["weather"] = null;
  let roadContext: DriverDetail["roadContext"] = null;

  if (lat != null && lng != null) {
    const now = new Date().toISOString();
    const [wx, road] = await Promise.all([
      fetchWeatherAtIncident(lat, lng, now).catch(() => null),
      fetchRoadContext(lat, lng, null).catch(() => null),
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
  }

  return { driver, allEventsForDriver, weather, roadContext, hosEvents, todaySnapshot, driverSummary };
}
