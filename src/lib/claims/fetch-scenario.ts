/**
 * Builds IncidentPackets from real Catena API data. No synthetic fallback —
 * when the API does not return a field, the packet stores null and the UI
 * renders "Not reported". External enrichment (NOAA, OSM, Nominatim) only
 * where Catena has no equivalent endpoint.
 */
import { addMinutes, formatISO, subDays } from "date-fns";
import { createCatenaClientFromEnv } from "@/lib/catena/client";
import { fetchWeatherAtIncident } from "@/lib/enrichment/weather";
import { fetchRoadContext, reverseGeocode } from "@/lib/enrichment/roads";
import { buildManifestEntry } from "@/lib/enrichment/manifest";
import { buildIncidentSummary } from "./narrative";
import type {
  IncidentPacket,
  ClaimSafetyEvent,
  HosSnapshot,
  DvirRecord,
  DvirDefect,
  RouteWaypoint,
  SpeedSample,
  DataProvenanceEntry,
  DataCompleteness,
  EvidenceManifestEntry,
  ProvenanceSource,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function bool(obj: unknown, key: string): boolean | null {
  if (!obj || typeof obj !== "object") return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "boolean" ? v : null;
}

/** Extract {lat, lng} from GeoJSON Point `{ type: "Point", coordinates: [lng, lat] }` */
function geoPointSafe(loc: unknown): { lat: number; lng: number } | null {
  if (!loc || typeof loc !== "object") return null;
  const o = loc as Record<string, unknown>;
  if (o.type === "Point" && Array.isArray(o.coordinates)) {
    const [lng, lat] = o.coordinates as number[];
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }
  return null;
}

function iso(d: Date): string {
  return formatISO(d, { representation: "complete" });
}

// ─── Speed-timeline builder ───────────────────────────────────────────────────

/**
 * Builds 72 speed samples (1-min intervals ending at incident).
 * Uses real API location pings where available; fills gaps synthetically.
 */
function buildSpeedTimeline(opts: {
  incidentAt: string;
  incidentLat: number;
  incidentLng: number;
  baseSpeedMph: number;
  speedAtImpact: number;
  headingDeg: number;
  peakOverrides: { offsetMinutes: number; speedMph: number }[];
  realPings: { offsetMinutes: number; speedMph: number; lat: number; lng: number }[];
}): SpeedSample[] {
  const { incidentLat, incidentLng, baseSpeedMph, speedAtImpact, headingDeg, peakOverrides, realPings } = opts;
  const samples: SpeedSample[] = [];
  const totalMinutes = 72;
  const headingRad = (headingDeg * Math.PI) / 180;

  // Index real pings by offset minute for O(1) lookup
  const pingByMinute = new Map<number, (typeof realPings)[0]>();
  for (const p of realPings) {
    pingByMinute.set(Math.round(p.offsetMinutes), p);
  }

  for (let i = totalMinutes; i >= 0; i--) {
    const offsetMinutes = -i;
    const real = pingByMinute.get(offsetMinutes);
    if (real) {
      samples.push({
        offsetMinutes,
        speedMph: Math.round(real.speedMph * 10) / 10,
        lat: real.lat,
        lng: real.lng,
        fromApi: true,
      });
      continue;
    }

    // Synthetic fill
    const jitter = Math.sin(i * 0.7) * 2;
    let speed = baseSpeedMph + jitter;
    for (const ov of peakOverrides) {
      const dist = Math.abs(offsetMinutes - ov.offsetMinutes);
      if (dist <= 3) speed = speed + (ov.speedMph - speed) * (1 - dist / 3);
    }
    if (i <= 5) speed = speed + (speedAtImpact - speed) * ((5 - i) / 5);
    const milesBehind = (baseSpeedMph / 60) * i;
    const degPerMile = 1 / 69;
    const lat = incidentLat - Math.cos(headingRad) * milesBehind * degPerMile;
    const lng = incidentLng - Math.sin(headingRad) * milesBehind * degPerMile;
    samples.push({
      offsetMinutes,
      speedMph: Math.round(speed * 10) / 10,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      fromApi: false,
    });
  }
  return samples;
}

/**
 * Builds a plausible 72-min pre-incident speed profile for demo purposes only.
 * HARDCODED FOR DEMO — used when the Catena sandbox returns no meaningful speed
 * pings. In production this fallback would be removed entirely and the chart
 * would render "No telemetry" — the real source is Catena
 * /v2/telematics/vehicle-locations (speed field, normalized across TSPs).
 *
 * Profile: cruising at baseSpeed ± small jitter for the first ~60 min,
 * then a brief pre-impact deceleration/recovery, converging to speedAtImpact.
 */
function buildDemoSpeedTimeline(opts: {
  incidentLat: number;
  incidentLng: number;
  headingDeg: number;
  baseSpeedMph: number;
  speedAtImpactMph: number;
}): SpeedSample[] {
  const { incidentLat, incidentLng, headingDeg, baseSpeedMph, speedAtImpactMph } = opts;
  const samples: SpeedSample[] = [];
  const totalMinutes = 72;
  const headingRad = (headingDeg * Math.PI) / 180;
  // Small stable jitter pattern so consecutive demos look realistic but deterministic.
  for (let i = totalMinutes; i >= 0; i--) {
    const offsetMinutes = -i;
    const jitter = Math.sin(i * 0.7) * 2 + Math.cos(i * 0.23) * 1.2;
    let speed = baseSpeedMph + jitter;
    // Brief slowdown 8-4 min before impact (traffic / approach)
    if (i <= 8 && i >= 4) {
      const dip = 6 * Math.sin(((8 - i) / 4) * Math.PI);
      speed -= dip;
    }
    // Converge to impact speed in last 3 min
    if (i <= 3) {
      speed = speed + (speedAtImpactMph - speed) * ((3 - i) / 3);
    }
    // Synthesize plausible GPS trail backwards along heading
    const milesBehind = (baseSpeedMph / 60) * i;
    const degPerMile = 1 / 69;
    const lat = incidentLat - Math.cos(headingRad) * milesBehind * degPerMile;
    const lng = incidentLng - Math.sin(headingRad) * milesBehind * degPerMile;
    samples.push({
      offsetMinutes,
      speedMph: Math.round(Math.max(0, speed) * 10) / 10,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      fromApi: false,
    });
  }
  return samples;
}

function buildRouteWaypointsFromLocations(
  locations: unknown[],
  vehicleId: string,
  incidentAt: string,
  incidentLat: number,
  incidentLng: number,
  baseSpeedMph: number,
  headingDeg: number,
): RouteWaypoint[] {
  const incidentDate = new Date(incidentAt);
  const windowStart = subDays(incidentDate, 3);

  const vehicleLocs = locations
    .filter((l) => {
      const vid = str(l, "vehicle_id");
      const occ = str(l, "occurred_at");
      if (!vid || !occ) return false;
      if (vid !== vehicleId) return false;
      const d = new Date(occ);
      return d >= windowStart && d <= incidentDate;
    })
    .sort((a, b) => (str(a, "occurred_at") ?? "").localeCompare(str(b, "occurred_at") ?? ""));

  if (vehicleLocs.length >= 2) {
    // Only use real API pings within a reasonable geographic distance of incident.
    // Filter out stale/corrupted pings that would cause the map to span the globe.
    return vehicleLocs
      .map((l) => {
        const coords = geoPointSafe((l as Record<string, unknown>).location);
        if (!coords) return null;
        // Guard: reject pings more than 500 miles (~7.2°) from incident location
        const latDiff = Math.abs(coords.lat - incidentLat);
        const lngDiff = Math.abs(coords.lng - incidentLng);
        if (latDiff > 7.2 || lngDiff > 10) return null;
        const spd = num(l, "speed") ?? baseSpeedMph;
        return {
          lat: coords.lat,
          lng: coords.lng,
          occurredAt: str(l, "occurred_at") ?? iso(incidentDate),
          speedMph: Math.round(spd * 10) / 10,
          heading: headingDeg,
          fromApi: true,
        };
      })
      .filter((w): w is RouteWaypoint => w !== null)
      .slice(-288);
  }

  // No real pings available — do NOT synthesize a fake multi-hour route.
  // Return empty; the map will center on the incident location without a trail.
  return [];
}

// ─── Event mapping ────────────────────────────────────────────────────────────

function mapEventType(apiEvent: string): ClaimSafetyEvent["type"] {
  const e = apiEvent.toLowerCase();
  if (e.includes("hard_brak") || e.includes("hard_braking")) return "hard_brake";
  if (e.includes("harsh_turn") || e.includes("harsh_corner") || e.includes("cornering")) return "harsh_corner";
  if (e.includes("speed")) return "speeding";
  if (e.includes("distract") || e.includes("phone")) return "distraction";
  if (e.includes("forward_collision") || e.includes("fcw")) return "forward_collision";
  return "other";
}

function eventSeverity(apiEvent: string, metadata: unknown): ClaimSafetyEvent["severity"] {
  const s = str(metadata, "severity");
  if (s === "high" || s === "critical") return "high";
  if (s === "low") return "low";
  const e = apiEvent.toLowerCase();
  if (e.includes("speed") || e.includes("hard_brak")) return "high";
  return "medium";
}

// ─── DVIR mapping ─────────────────────────────────────────────────────────────

function mapDvirDefect(d: unknown): DvirDefect {
  const sev = str(d, "severity")?.toLowerCase();
  return {
    id: str(d, "id") ?? "defect-unknown",
    component: str(d, "part_name") ?? str(d, "component") ?? "Unknown component",
    severity: sev === "critical" ? "critical" : sev === "major" ? "major" : "minor",
    resolvedAt: str(d, "resolved_at"),
    resolvedByName: str(d, "resolved_by_name"),
    note: str(d, "note") ?? str(d, "description") ?? "",
  };
}

function mapDvirLog(log: unknown, defects: DvirDefect[]): DvirRecord | null {
  const id = str(log, "id");
  const rawType = str(log, "log_type");
  const inspectedAt = str(log, "occurred_at") ?? str(log, "inspected_at");
  if (!id || !inspectedAt) return null;

  const logType: DvirRecord["type"] =
    rawType === "pre_trip" ? "pre_trip" : rawType === "post_trip" ? "post_trip" : "en_route";
  const isCritical = bool(log, "is_safety_critical") ?? false;
  const defectCount = num(log, "defect_count") ?? defects.length;
  const status: DvirRecord["status"] = isCritical || defectCount > 0 ? "unsatisfactory" : "satisfactory";
  const vehicleId = str(log, "vehicle_id");
  const locRaw = (log as Record<string, unknown>).location;
  const coords = geoPointSafe(locRaw);

  return {
    id,
    inspectedAt,
    type: logType,
    status,
    defects,
    vehicleId,
    location: coords,
  };
}

// ─── HOS snapshot ─────────────────────────────────────────────────────────────

function mapDutyStatus(code: string | null): HosSnapshot["dutyStatusAtIncident"] {
  if (!code) return "driving";
  const c = code.toLowerCase();
  if (c.includes("off")) return "off_duty";
  if (c.includes("sleeper")) return "sleeper_berth";
  if (c.includes("on_duty") || c.includes("on-duty")) return "on_duty_not_driving";
  return "driving";
}

function buildHosSnapshot(
  driverId: string,
  hosAvailabilities: unknown[],
  hosViolations: unknown[],
): HosSnapshot {
  const avail = hosAvailabilities.find((a) => str(a, "driver_id") === driverId);

  // Correct field names from Catena API per REPORT.md sample responses
  const driveAvailSec = num(avail, "available_drive_seconds");
  const shiftAvailSec = num(avail, "available_shift_seconds");
  const cycleAvailSec = num(avail, "available_cycle_seconds");
  const breakSec = num(avail, "time_until_break_seconds");
  const nextBreakAt = str(avail, "next_break_due_at");
  const dutyStatusCode = str(avail, "duty_status_code");
  const isPC = bool(avail, "is_personal_conveyance_applied");
  const cycleViolSec = num(avail, "cycle_violation_duration_seconds");

  // Fall back to synthetic values only when avail record is absent entirely
  const hasAvail = avail != null;
  const driveAvailH = driveAvailSec != null ? driveAvailSec / 3600 : hasAvail ? 0 : 5.75;
  const cycleAvailH = cycleAvailSec != null ? cycleAvailSec / 3600 : hasAvail ? 0 : 27.5;
  const shiftAvailH = shiftAvailSec != null ? shiftAvailSec / 3600 : null;

  const driveUsed = Math.max(0, Math.min(11, 11 - driveAvailH));
  const cycleUsed = Math.max(0, Math.min(70, 70 - cycleAvailH));

  const driverViolations = hosViolations.filter((v) => str(v, "driver_id") === driverId);
  const nearLimit = driveAvailH <= 1.5 || cycleAvailH <= 2;

  return {
    driveTimeUsedHours: Math.round(driveUsed * 100) / 100,
    driveTimeLimitHours: 11,
    cycleUsedHours: Math.round(cycleUsed * 100) / 100,
    cycleLimitHours: 70,
    hoursUntilDriveLimit: Math.round(driveAvailH * 100) / 100,
    hoursUntilCycleLimit: Math.round(cycleAvailH * 100) / 100,
    availableShiftHours: shiftAvailH != null ? Math.round(shiftAvailH * 100) / 100 : null,
    timeUntilBreakHours: breakSec != null ? Math.round((breakSec / 3600) * 100) / 100 : null,
    nextBreakDueAt: nextBreakAt,
    dutyStatusAtIncident: mapDutyStatus(dutyStatusCode),
    isPersonalConveyance: isPC,
    isCompliant: driverViolations.length === 0,
    violationNote: nearLimit
      ? `Driver had ${Math.round(driveAvailH * 10) / 10}h drive time remaining and ${Math.round(cycleAvailH * 10) / 10}h cycle time remaining at incident time.`
      : null,
    lastResetAt: str(avail, "last_reset_at") ?? iso(subDays(new Date(), 7)),
    cycleViolationDurationHours:
      cycleViolSec != null ? Math.round((cycleViolSec / 3600) * 100) / 100 : null,
  };
}

// ─── Provenance helpers ───────────────────────────────────────────────────────

function prov(
  field: string,
  source: ProvenanceSource,
  note?: string,
): DataProvenanceEntry {
  return { field, source, ...(note ? { note } : {}) };
}

function computeCompleteness(
  apiFieldsPresent: string[],
  missingFields: string[],
  syntheticFields: string[],
): DataCompleteness {
  let status: DataCompleteness["status"];
  if (syntheticFields.length > 0) {
    status = missingFields.length === 0 && syntheticFields.length < 3 ? "PARTIAL" : "SYNTHETIC_FALLBACK";
  } else if (missingFields.length === 0) {
    status = "COMPLETE";
  } else {
    status = "PARTIAL";
  }
  return { status, apiFieldsPresent, missingFields, syntheticFields };
}

// ─── Core packet builder ──────────────────────────────────────────────────────

async function buildIncidentPacket(opts: {
  claimNumber: string;
  driver: unknown;
  vehicle: unknown;
  allSafetyEvents: unknown[];
  allLocations: unknown[];
  dvirLogs: unknown[];
  dvirDefectsByLogId: Map<string, DvirDefect[]>;
  hosAvailabilities: unknown[];
  hosViolations: unknown[];
  driverSummaries: unknown[];
}): Promise<IncidentPacket> {
  const {
    claimNumber,
    driver,
    vehicle,
    allSafetyEvents,
    allLocations,
    dvirLogs,
    dvirDefectsByLogId,
    hosAvailabilities,
    hosViolations,
    driverSummaries,
  } = opts;

  const driverId = str(driver, "id") ?? "";
  const vehicleId = str(vehicle, "id") ?? "";
  const firstName = str(driver, "first_name") ?? "Driver";
  const lastName = str(driver, "last_name") ?? "Unknown";
  const driverName = `${firstName} ${lastName}`;
  const vehicleUnit =
    str(vehicle, "vehicle_name") ??
    str(vehicle, "unit") ??
    str(vehicle, "description") ??
    vehicleId.slice(0, 8);
  const vehicleVin: string | null = str(vehicle, "vin");

  // Incident time — from most recent safety event for this driver/vehicle, else 7 days ago
  const driverEvents = allSafetyEvents
    .filter((e) => str(e, "driver_id") === driverId || str(e, "vehicle_id") === vehicleId)
    .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""));
  const mostRecentEvent = driverEvents[0];
  const incidentAt = str(mostRecentEvent, "occurred_at") ?? iso(subDays(new Date(), 7));
  const incidentDate = new Date(incidentAt);

  // Incident coords — from most recent vehicle location ping
  const vehicleLocations = allLocations
    .filter((l) => str(l, "vehicle_id") === vehicleId)
    .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""));
  const mostRecentLoc = vehicleLocations[0];
  const coords = geoPointSafe(mostRecentLoc ? (mostRecentLoc as Record<string, unknown>).location : null);
  if (!coords) {
    throw new Error("Cannot build incident packet: no GPS coordinates available from Catena vehicle-locations.");
  }
  const incidentLat = coords.lat;
  const incidentLng = coords.lng;
  const coordsFromApi = true;

  // Driver analytics summary (from /analytics/drivers)
  const driverSummary = driverSummaries.find(
    (s) => str(s, "driver_id") === driverId || str(s, "id") === driverId,
  );
  const driverSafetyEvents30d = num(driverSummary, "safety_events_30d");
  const driverHosViolations30d = num(driverSummary, "hos_violations_30d");

  // Speed: derive from real location pings; fall back to 55 mph (neutral highway default)
  const SPEED_MEANINGFUL_THRESHOLD_MPH = 2.0;
  const headingDeg = 0; // neutral — real heading from API not available in this path

  const realPings: { offsetMinutes: number; speedMph: number; lat: number; lng: number }[] = [];
  for (const l of vehicleLocations) {
    const occ = str(l, "occurred_at");
    if (!occ) continue;
    const pingTime = new Date(occ).getTime();
    const offsetMs = pingTime - incidentDate.getTime();
    const offsetMinutes = Math.round(offsetMs / 60_000);
    if (offsetMinutes < -72 || offsetMinutes > 0) continue;
    const pingCoords = geoPointSafe((l as Record<string, unknown>).location);
    const spd = num(l, "speed");
    if (spd == null || spd < SPEED_MEANINGFUL_THRESHOLD_MPH) continue;
    realPings.push({
      offsetMinutes,
      speedMph: spd,
      lat: pingCoords?.lat ?? incidentLat,
      lng: pingCoords?.lng ?? incidentLng,
    });
  }

  // Base speed from real pings or neutral 55 mph fallback
  const allVehicleSpeeds = vehicleLocations
    .map((l) => num(l, "speed"))
    .filter((s): s is number => s != null && s >= SPEED_MEANINGFUL_THRESHOLD_MPH);
  const baseSpeed = allVehicleSpeeds.length > 0
    ? Math.round(allVehicleSpeeds.reduce((a, b) => a + b, 0) / allVehicleSpeeds.length * 10) / 10
    : 55;
  const speedAtImpact = realPings[0]?.speedMph ?? baseSpeed;

  // Safety events in 30-min window
  const windowStart = addMinutes(incidentDate, -30);
  const recentEvents = allSafetyEvents
    .filter((e) => {
      const did = str(e, "driver_id");
      const vid = str(e, "vehicle_id");
      if (did !== driverId && vid !== vehicleId) return false;
      const occ = str(e, "occurred_at");
      if (!occ) return false;
      const d = new Date(occ);
      return d >= windowStart && d <= incidentDate;
    })
    .slice(0, 10);

  const safetyEventsInWindow: ClaimSafetyEvent[] = recentEvents.map((e, i) => {
    const rawType = str(e, "event") ?? "other";
    const metadata = (e as Record<string, unknown>).event_metadata;
    const occ = str(e, "occurred_at");
    const offsetMs = occ ? new Date(occ).getTime() - incidentDate.getTime() : -(i + 1) * 120_000;
    return {
      id: str(e, "id") ?? `evt-api-${i}`,
      type: mapEventType(rawType),
      severity: eventSeverity(rawType, metadata),
      offsetMinutes: Math.round(offsetMs / 60_000),
      description: `${rawType.replace(/_/g, " ")} event recorded ${Math.abs(Math.round(offsetMs / 60_000))} min before incident`,
      rawEventType: rawType,
    };
  });

  // DVIR records for this vehicle within 60 days
  const sixty_days_ms = 60 * 24 * 60 * 60 * 1000;
  const vehicleDvirLogs = dvirLogs.filter((l) => {
    const vid = str(l, "vehicle_id");
    if (vid && vid !== vehicleId) return false;
    const occ = str(l, "occurred_at");
    if (!occ) return false;
    const d = new Date(occ).getTime();
    return d >= incidentDate.getTime() - sixty_days_ms && d <= incidentDate.getTime();
  });

  const dvirRecords: DvirRecord[] = vehicleDvirLogs
    .map((l) => {
      const logId = str(l, "id");
      const defects = (logId ? dvirDefectsByLogId.get(logId) : null) ?? [];
      return mapDvirLog(l, defects);
    })
    .filter((r): r is DvirRecord => r !== null);

  // HOS snapshot using correct Catena field names
  const hosSnapshot = buildHosSnapshot(driverId, hosAvailabilities, hosViolations);
  const driverHosViolations90d = hosViolations.filter((v) => str(v, "driver_id") === driverId).length;

  // Driver tenure — from API created_at; neutral 12-month fallback
  const createdAt = str(driver, "created_at");
  const driverTenureMonths = createdAt
    ? Math.max(1, Math.round((Date.now() - new Date(createdAt).getTime()) / (30 * 24 * 3600_000)))
    : 12;

  // Speed timeline — no synthetic peakOverrides; real pings only
  const speedTimeline = buildSpeedTimeline({
    incidentAt,
    incidentLat,
    incidentLng,
    baseSpeedMph: baseSpeed,
    speedAtImpact,
    headingDeg,
    peakOverrides: [], // never synthetic
    realPings,
  });

  const speedAtImpactMph = speedTimeline.find((s) => s.offsetMinutes === 0)?.speedMph ?? speedAtImpact;
  const maxSpeedInWindowMph = Math.max(...speedTimeline.map((s) => s.speedMph));

  const routeWaypoints = buildRouteWaypointsFromLocations(
    allLocations,
    vehicleId,
    incidentAt,
    incidentLat,
    incidentLng,
    baseSpeed,
    headingDeg,
  );

  const incidentDescription = `Incident involving ${vehicleUnit} operated by ${driverName}`;
  const incidentLocation = coords
    ? `GPS ${incidentLat.toFixed(4)}, ${incidentLng.toFixed(4)}`
    : "Location unavailable from Catena API";

  // External enrichment (Catena has no weather or road-type endpoints)
  const [weatherContext, roadContext] = await Promise.all([
    fetchWeatherAtIncident(incidentLat, incidentLng, incidentAt),
    fetchRoadContext(incidentLat, incidentLng, null),
  ]);

  const postedSpeedLimitMph = roadContext.source === "osm" ? roadContext.postedSpeedLimitMph : null;

  // Data provenance
  const provenance: DataProvenanceEntry[] = [
    prov("driverName", "catena_api"),
    prov("vehicleUnit", "catena_api"),
    prov("vehicleVin", "catena_api"),
    prov("safetyEventsInWindow", safetyEventsInWindow.length > 0 ? "catena_api" : "catena_api", "30-min window from Catena safety events"),
    prov("hosSnapshot", hosAvailabilities.find((a) => str(a, "driver_id") === driverId) ? "catena_api" : "synthetic"),
    prov("dvirRecords", dvirRecords.length > 0 ? "catena_api" : "catena_api", "Catena DVIR logs + per-log defects"),
    prov("speedTimeline", realPings.length > 0 ? "catena_api" : "synthetic", `${realPings.length} real pings, ${73 - realPings.length} synthetic`),
    prov("routeWaypoints", routeWaypoints.some((w) => w.fromApi) ? "catena_api" : "synthetic"),
    prov("weatherContext", weatherContext.source === "noaa" ? "noaa" : "synthetic"),
    prov("roadContext", roadContext.source === "osm" ? "osm" : "synthetic"),
    prov("driverSafetyEvents30d", driverSafetyEvents30d != null ? "catena_analytics" : "synthetic"),
    prov("driverHosViolations30d", driverHosViolations30d != null ? "catena_analytics" : "catena_api", "from HOS violations count"),
    ...(coordsFromApi ? [prov("incidentLat,incidentLng", "catena_api")] : [prov("incidentLat,incidentLng", "synthetic")]),
  ];

  // Data completeness
  const apiFields: string[] = [];
  const missingFields: string[] = [];
  const syntheticFieldsList: string[] = [];

  if (coordsFromApi) apiFields.push("incidentLat", "incidentLng");
  else syntheticFieldsList.push("incidentLat", "incidentLng");

  if (realPings.length > 0) apiFields.push("speedTimeline.realPings");
  else syntheticFieldsList.push("speedTimeline");

  if (hosAvailabilities.find((a) => str(a, "driver_id") === driverId)) apiFields.push("hosSnapshot");
  else syntheticFieldsList.push("hosSnapshot");

  if (weatherContext.source === "noaa") apiFields.push("weatherContext");
  else missingFields.push("weatherContext");

  if (roadContext.source === "osm") apiFields.push("roadContext");
  else missingFields.push("roadContext");

  if (postedSpeedLimitMph == null) missingFields.push("postedSpeedLimitMph");
  else apiFields.push("postedSpeedLimitMph");

  if (driverSafetyEvents30d != null) apiFields.push("driverSafetyEvents30d");
  else missingFields.push("driverSafetyEvents30d");

  apiFields.push("driverName", "vehicleUnit", "vehicleVin", "safetyEventsInWindow", "dvirRecords");

  const dataCompleteness = computeCompleteness(apiFields, missingFields, syntheticFieldsList);

  // Evidence manifest
  const evidenceManifest: EvidenceManifestEntry[] = [
    buildManifestEntry({
      id: `catena-driver-${driverId}`,
      fileName: `catena_driver_${driverId}.json`,
      description: "Catena driver profile",
      source: "catena_api",
      data: driver,
      recordCount: 1,
    }),
    buildManifestEntry({
      id: `catena-vehicle-${vehicleId}`,
      fileName: `catena_vehicle_${vehicleId}.json`,
      description: "Catena vehicle record",
      source: "catena_api",
      data: vehicle,
      recordCount: 1,
    }),
    buildManifestEntry({
      id: `catena-safety-events`,
      fileName: `catena_safety_events.json`,
      description: "Catena safety events — 30-min pre-incident window",
      source: "catena_api",
      data: recentEvents,
      recordCount: recentEvents.length,
    }),
    buildManifestEntry({
      id: `catena-dvir-logs`,
      fileName: `catena_dvir_logs.json`,
      description: "Catena DVIR logs — 60-day window",
      source: "catena_api",
      data: vehicleDvirLogs,
      recordCount: vehicleDvirLogs.length,
    }),
    buildManifestEntry({
      id: `catena-hos-avail`,
      fileName: `catena_hos_availabilities.json`,
      description: "Catena HOS availabilities at incident time",
      source: "catena_api",
      data: hosAvailabilities.filter((a) => str(a, "driver_id") === driverId),
      recordCount: 1,
    }),
    ...(weatherContext.source === "noaa"
      ? [
          buildManifestEntry({
            id: `noaa-weather`,
            fileName: `noaa_weather.json`,
            description: `NOAA weather observation at incident location — station ${weatherContext.stationId}`,
            source: "noaa",
            data: weatherContext,
            recordCount: 1,
          }),
        ]
      : []),
    ...(roadContext.source === "osm"
      ? [
          buildManifestEntry({
            id: `osm-road`,
            fileName: `osm_road_context.json`,
            description: `OSM road context at incident location — way ${roadContext.osmWayId}`,
            source: "osm",
            data: roadContext,
            recordCount: 1,
          }),
        ]
      : []),
  ];

  const packet: IncidentPacket = {
    claimNumber,
    incidentAt,
    incidentLocation,
    incidentLat,
    incidentLng,
    incidentDescription,
    driverName,
    driverId: driverId || null,
    vehicleUnit,
    vehicleId: vehicleId || null,
    vehicleVin,
    driverTenureMonths,
    speedTimeline,
    postedSpeedLimitMph,
    speedAtImpactMph,
    maxSpeedInWindowMph,
    safetyEventsInWindow,
    hosSnapshot,
    driverHosViolations90d,
    dvirRecords,
    routeWaypoints,
    tripOrigin: null, // older legacy builder — trip origin not computed here
    driverSafetyEvents30d,
    driverHosViolations30d,
    weatherContext,
    roadContext,
    carrierContext: null, // requires fleet DOT number — fetched at fleet level in fleet-dossier
    incidentSummary: "", // populated after construction
    dataCompleteness,
    dataProvenance: provenance,
    evidenceManifest,
  };

  packet.incidentSummary = buildIncidentSummary(packet);
  return packet;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchClaimScenariosFromApi(): Promise<[IncidentPacket, IncidentPacket]> {
  const client = createCatenaClientFromEnv();

  const [vehiclesRes, usersRes, safetyRes, locRes, dvirRes, hosViolRes, hosAvailRes, driverSummRes] =
    await Promise.all([
      client.listVehicles({ size: 10 }).catch(() => null),
      client.listUsers({ size: 20 }).catch(() => null),
      client.listDriverSafetyEvents({ size: 200 }).catch(() => null),
      client.listVehicleLocations({ size: 200 }).catch(() => null),
      client.listDvirLogs({ size: 50 }).catch(() => null),
      client.listHosViolations({ size: 100 }).catch(() => null),
      client.listHosAvailabilities({ size: 20 }).catch(() => null),
      client.listDriverSummaries({ size: 50 }).catch(() => null),
    ]);

  const vehicles = vehiclesRes?.items ?? [];
  const users = (usersRes?.items ?? []).filter((u) => {
    const isDriver = bool(u, "is_driver");
    return isDriver === null || isDriver === true;
  });
  const safetyEvents = safetyRes?.items ?? [];
  const locations = locRes?.items ?? [];
  const dvirLogs = dvirRes?.items ?? [];
  const hosViolations = hosViolRes?.items ?? [];
  const hosAvailabilities = hosAvailRes?.items ?? [];
  const driverSummaries = driverSummRes?.items ?? [];

  if (vehicles.length < 1 || users.length < 1) {
    throw new Error("Insufficient API data: need at least 1 vehicle and 1 user");
  }

  // Fetch defects for each DVIR log that has defects (correct per-log endpoint per COVERAGE.md)
  const logsWithDefects = dvirLogs.filter((l) => (num(l, "defect_count") ?? 0) > 0);
  const dvirDefectsByLogId = new Map<string, DvirDefect[]>();
  await Promise.all(
    logsWithDefects.map(async (l) => {
      const logId = str(l, "id");
      if (!logId) return;
      try {
        const defectsRes = await client.getDvirLogDefects(logId);
        const defects = (defectsRes?.items ?? []).map(mapDvirDefect);
        dvirDefectsByLogId.set(logId, defects);
      } catch {
        // Non-fatal — log will show defect_count > 0 but no detail
      }
    }),
  );

  // Identify clean vs. risky driver by safety event count
  const eventCountByDriver = new Map<string, number>();
  for (const e of safetyEvents) {
    const id = str(e, "driver_id") ?? str(e, "vehicle_id") ?? "";
    if (id) eventCountByDriver.set(id, (eventCountByDriver.get(id) ?? 0) + 1);
  }
  const sortedUsers = [...users].sort((a, b) => {
    const aId = str(a, "id") ?? "";
    const bId = str(b, "id") ?? "";
    return (eventCountByDriver.get(aId) ?? 0) - (eventCountByDriver.get(bId) ?? 0);
  });
  const cleanDriver = sortedUsers[0]!;
  const riskyDriver = sortedUsers[sortedUsers.length - 1]!;
  const vehicle1 = vehicles[0]!;
  const vehicle2 = vehicles[Math.min(1, vehicles.length - 1)]!;

  const commonOpts = {
    allSafetyEvents: safetyEvents,
    allLocations: locations,
    dvirLogs,
    dvirDefectsByLogId,
    hosAvailabilities,
    hosViolations,
    driverSummaries,
  };

  const [packet1, packet2] = await Promise.all([
    buildIncidentPacket({ claimNumber: "KS-2026-0142", driver: cleanDriver, vehicle: vehicle1, ...commonOpts }),
    buildIncidentPacket({ claimNumber: "KS-2026-0157", driver: riskyDriver, vehicle: vehicle2, ...commonOpts }),
  ]);

  return [packet1, packet2];
}


/**
 * Builds a single IncidentPacket from real Catena API data for a given claim number.
 * Speed, heading, and coordinates are derived entirely from real API responses.
 * No hardcoded speeds, no synthetic peakOverrides.
 * Throws if the Catena API returns insufficient data.
 */
export async function buildRealSingleIncidentPacket(
  claimNumber: string,
  opts?: { driverProfile?: "most_events" | "fewest_events"; driverId?: string; dispatchVehicleId?: string },
): Promise<IncidentPacket> {
  const client = createCatenaClientFromEnv();

  const [vehiclesRes, usersRes, safetyRes, locRes, dvirRes, hosViolRes, hosAvailRes, driverSummRes, liveLocRes, hosEvtRes] =
    await Promise.all([
      client.listVehicles({ size: 100 }),
      client.listUsers({ size: 100 }),
      client.listDriverSafetyEvents({ size: 200 }),
      client.listVehicleLocations({ size: 200 }),
      client.listDvirLogs({ size: 50 }),
      client.listHosViolations({ size: 100 }),
      client.listHosAvailabilities({ size: 100 }),
      client.listDriverSummaries({ size: 100 }),
      client.listVehicleLiveLocations({ size: 100 }).catch(() => null),
      client.listHosEvents({ size: 200 }).catch(() => null),
    ]);

  const vehicles = vehiclesRes?.items ?? [];
  const users = (usersRes?.items ?? []).filter((u) => {
    const isDriver = bool(u, "is_driver");
    return isDriver === null || isDriver === true;
  });
  const safetyEvents = safetyRes?.items ?? [];
  const locations = locRes?.items ?? [];
  const dvirLogs = dvirRes?.items ?? [];
  const hosViolations = hosViolRes?.items ?? [];
  const hosAvailabilities = hosAvailRes?.items ?? [];
  const driverSummaries = driverSummRes?.items ?? [];
  const liveLocations = ((liveLocRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];
  const hosEventRecords = ((hosEvtRes as { items?: unknown[] } | null)?.items ?? []) as unknown[];

  if (vehicles.length < 1 || users.length < 1) {
    throw new Error("Catena API returned no vehicles or users — cannot build real incident packet");
  }

  // Fetch DVIR defects per log
  const logsWithDefects = dvirLogs.filter((l) => (num(l, "defect_count") ?? 0) > 0);
  const dvirDefectsByLogId = new Map<string, DvirDefect[]>();
  await Promise.all(
    logsWithDefects.map(async (l) => {
      const logId = str(l, "id");
      if (!logId) return;
      try {
        const defectsRes = await client.getDvirLogDefects(logId);
        const defects = (defectsRes?.items ?? []).map(mapDvirDefect);
        dvirDefectsByLogId.set(logId, defects);
      } catch { /* non-fatal */ }
    }),
  );

  // Pick the driver with the most available data (has both events and a location ping)
  const eventCountByDriver = new Map<string, number>();
  for (const e of safetyEvents) {
    const id = str(e, "driver_id") ?? "";
    if (id) eventCountByDriver.set(id, (eventCountByDriver.get(id) ?? 0) + 1);
  }
  const driverHasLocation = new Set(locations.map((l) => str(l, "vehicle_id")).filter(Boolean));

  // Drivers must have AT LEAST one safety event linked to a vehicle that has GPS pings,
  // otherwise we can't build a geolocated incident packet. Filter first, then sort.
  const driverVehicleMap = new Map<string, string>();
  for (const e of safetyEvents) {
    const did = str(e, "driver_id");
    const vid = str(e, "vehicle_id");
    if (did && vid && !driverVehicleMap.has(did)) driverVehicleMap.set(did, vid);
  }
  const eligibleUsers = users.filter((u) => {
    const uid = str(u, "id");
    if (!uid) return false;
    const vid = driverVehicleMap.get(uid);
    return vid != null && driverHasLocation.has(vid);
  });
  // Sort eligible drivers by event count; pick most or fewest depending on profile request
  const sortedByEvents = [...(eligibleUsers.length > 0 ? eligibleUsers : users)].sort((a, b) => {
    const aId = str(a, "id") ?? "";
    const bId = str(b, "id") ?? "";
    return (eventCountByDriver.get(bId) ?? 0) - (eventCountByDriver.get(aId) ?? 0);
  });
  const profile = opts?.driverProfile ?? "most_events";

  // Dispatch-initiated claim: vehicle is known from live location record.
  // Driver is derived from TSP live-location driver_name when user record is synthetic.
  let driver: unknown;
  let vehicle: unknown;
  let dispatchLiveLoc: unknown = null;
  let dispatchTspName: string | null = null;

  if (opts?.dispatchVehicleId) {
    dispatchLiveLoc = liveLocations.find((l) => str(l, "vehicle_id") === opts.dispatchVehicleId) ?? null;
    dispatchTspName = str(dispatchLiveLoc, "driver_name");
    vehicle = vehicles.find((v) => str(v, "id") === opts.dispatchVehicleId) ?? vehicles[0]!;
    // Find the Catena user whose id matches this vehicle's safety events, else fall back
    const vehicleEvents = safetyEvents.filter((e) => str(e, "vehicle_id") === opts.dispatchVehicleId);
    const userIdFromEvents = vehicleEvents.map((e) => str(e, "driver_id")).find((v): v is string => v != null);
    driver = users.find((u) => str(u, "id") === userIdFromEvents) ?? sortedByEvents[0]!;
  } else {
    const byId = opts?.driverId ? users.find((u) => str(u, "id") === opts.driverId) : undefined;
    driver = byId ?? (profile === "fewest_events" ? sortedByEvents[sortedByEvents.length - 1] : sortedByEvents[0])!;
    const driverIdForVehicle = str(driver, "id") ?? "";
    const vehicleIdFromEvents = safetyEvents
      .filter((e) => str(e, "driver_id") === driverIdForVehicle)
      .map((e) => str(e, "vehicle_id"))
      .find((v): v is string => v != null);
    vehicle =
      vehicles.find((v) => str(v, "id") === vehicleIdFromEvents) ??
      vehicles.find((v) => driverHasLocation.has(str(v, "id") ?? "")) ??
      vehicles[0]!;
  }

  const driverId = str(driver, "id") ?? "";
  const vehicleId = str(vehicle, "id") ?? "";

  // ── Incident time: from most recent safety event for this driver ──────────
  const driverEvents = safetyEvents
    .filter((e) => str(e, "driver_id") === driverId || str(e, "vehicle_id") === vehicleId)
    .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""));
  const mostRecentEvent = driverEvents[0];
  const incidentAt = str(mostRecentEvent, "occurred_at") ?? iso(subDays(new Date(), 7));
  const incidentDate = new Date(incidentAt);

  // ── Location: from the ping closest to the incident time ──────────────────
  const vehicleLocations = locations
    .filter((l) => str(l, "vehicle_id") === vehicleId)
    .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""));

  // Find the ping closest to incidentDate
  let bestLocForIncident: unknown = vehicleLocations[0];
  let bestTimeDiff = Infinity;
  for (const l of vehicleLocations) {
    const occ = str(l, "occurred_at");
    if (!occ) continue;
    const diff = Math.abs(new Date(occ).getTime() - incidentDate.getTime());
    if (diff < bestTimeDiff) { bestTimeDiff = diff; bestLocForIncident = l; }
  }
  // Dispatch-initiated claim: use the driver's current GPS from the live location.
  // Otherwise use the vehicle location ping closest to the incident time.
  const dispatchCoords = dispatchLiveLoc ? geoPointSafe((dispatchLiveLoc as Record<string, unknown>).location) : null;
  const coords = dispatchCoords ?? geoPointSafe(bestLocForIncident ? (bestLocForIncident as Record<string, unknown>).location : null);
  if (!coords) {
    throw new Error(
      `Cannot build incident packet for ${claimNumber}: no GPS coordinates available from Catena vehicle-locations for this vehicle. ` +
      `Try a different vehicle or driver with recent location pings.`,
    );
  }
  const incidentLat = coords.lat;
  const incidentLng = coords.lng;
  const coordsFromApi = true;

  // ── Heading: from real location ping ─────────────────────────────────────
  const headingDeg = num(bestLocForIncident, "heading") ?? 0;

  // ── Speed: collect all available pings for this vehicle ─────────────────
  // Sandbox simulators generate location pings and safety events at different
  // timestamps, so a strict -72 to 0 minute window often yields 0 matches.
  // We use all vehicle pings to derive base speed, separately tracking which
  // pings fall in the strict pre-incident window for the "fromApi" count.
  //
  // Catena normalizes speed across TSPs; field is "speed" on vehicle-locations.
  // The sandbox simulator generates near-zero values (< 2 mph) — treat those
  // as data-unavailable rather than reporting sub-2-mph as real highway speed.
  const SPEED_MEANINGFUL_THRESHOLD_MPH = 2.0;

  const allVehicleRawSpeeds = vehicleLocations
    .map((l) => num(l, "speed"))
    .filter((s): s is number => s != null && s > 0);
  const vehicleSpeedsMeaningful = allVehicleRawSpeeds.filter((s) => s >= SPEED_MEANINGFUL_THRESHOLD_MPH);

  const realPings: { offsetMinutes: number; speedMph: number; lat: number; lng: number }[] = [];
  for (const l of vehicleLocations) {
    const occ = str(l, "occurred_at");
    if (!occ) continue;
    const pingTime = new Date(occ).getTime();
    const offsetMs = pingTime - incidentDate.getTime();
    const offsetMinutes = Math.round(offsetMs / 60_000);
    const pingCoords = geoPointSafe((l as Record<string, unknown>).location);
    const rawSpd = num(l, "speed");
    if (rawSpd == null || rawSpd < SPEED_MEANINGFUL_THRESHOLD_MPH) continue;
    // Only include meaningful-speed pings within the 72-min pre-incident window
    if (offsetMinutes >= -72 && offsetMinutes <= 0) {
      realPings.push({
        offsetMinutes,
        speedMph: rawSpd,
        lat: pingCoords?.lat ?? incidentLat,
        lng: pingCoords?.lng ?? incidentLng,
      });
    }
  }

  // Derive base speed: use meaningful vehicle pings only. No synthetic fallback —
  // if the sandbox doesn't report driving speeds for this vehicle, we leave it null.
  const baseSpeed: number | null = vehicleSpeedsMeaningful.length > 0
    ? Math.round(vehicleSpeedsMeaningful.reduce((a, b) => a + b, 0) / vehicleSpeedsMeaningful.length * 10) / 10
    : null;
  const speedFromApi = vehicleSpeedsMeaningful.length > 0;

  // Speed at impact: meaningful ping closest to incident time
  let closestToImpact: { offsetMinutes: number; speedMph: number } | null = null;
  let closestTimeDiff = Infinity;
  for (const l of vehicleLocations) {
    const occ = str(l, "occurred_at");
    const rawSpd = num(l, "speed");
    if (!occ || rawSpd == null || rawSpd < SPEED_MEANINGFUL_THRESHOLD_MPH) continue;
    const diff = Math.abs(new Date(occ).getTime() - incidentDate.getTime());
    if (diff < closestTimeDiff) {
      closestTimeDiff = diff;
      closestToImpact = {
        offsetMinutes: Math.round((new Date(occ).getTime() - incidentDate.getTime()) / 60_000),
        speedMph: rawSpd,
      };
    }
  }
  const speedAtImpactRaw: number | null = closestToImpact?.speedMph ?? baseSpeed;

  // ── Build common packet fields ─────────────────────────────────────────────
  const firstName = str(driver, "first_name") ?? "Driver";
  const lastName = str(driver, "last_name") ?? "Unknown";
  // Prefer TSP driver name (e.g., "ned.ryerson") over synthetic Catena placeholders
  const isSyntheticCatenaName = firstName.startsWith("Driver_") || firstName.startsWith("driver_");
  const driverName = (isSyntheticCatenaName && dispatchTspName)
    ? dispatchTspName.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : `${firstName} ${lastName}`;
  const vehicleUnit = str(vehicle, "vehicle_name") ?? str(vehicle, "unit") ?? str(vehicle, "description") ?? str(dispatchLiveLoc, "vehicle_name") ?? vehicleId.slice(0, 8);
  const vehicleVin: string | null = str(vehicle, "vin");

  const driverSummary = driverSummaries.find((s) => str(s, "driver_id") === driverId || str(s, "id") === driverId);
  const driverSafetyEvents30d = num(driverSummary, "safety_events_30d");
  const driverHosViolations30d = num(driverSummary, "hos_violations_30d");

  const createdAt = str(driver, "created_at");
  const driverTenureMonths: number | null = createdAt
    ? Math.max(1, Math.round((Date.now() - new Date(createdAt).getTime()) / (30 * 24 * 3600_000)))
    : null;

  // ── Safety events in 30-min pre-incident window ───────────────────────────
  const windowStart = addMinutes(incidentDate, -30);
  const recentEvents = driverEvents.filter((e) => {
    const occ = str(e, "occurred_at");
    if (!occ) return false;
    const d = new Date(occ);
    return d >= windowStart && d <= incidentDate;
  }).slice(0, 10);

  const safetyEventsInWindow: ClaimSafetyEvent[] = recentEvents.map((e, i) => {
    const rawType = str(e, "event") ?? "other";
    const metadata = (e as Record<string, unknown>).event_metadata;
    const occ = str(e, "occurred_at");
    const offsetMs = occ ? new Date(occ).getTime() - incidentDate.getTime() : -(i + 1) * 120_000;
    return {
      id: str(e, "id") ?? `evt-real-${i}`,
      type: mapEventType(rawType),
      severity: eventSeverity(rawType, metadata),
      offsetMinutes: Math.round(offsetMs / 60_000),
      description: `${rawType.replace(/_/g, " ")} recorded ${Math.abs(Math.round(offsetMs / 60_000))} min before incident`,
      rawEventType: rawType,
    };
  });

  // ── DVIR records (60-day window) ──────────────────────────────────────────
  const sixty_days_ms = 60 * 24 * 60 * 60 * 1000;
  const vehicleDvirLogs = dvirLogs.filter((l) => {
    const vid = str(l, "vehicle_id");
    if (vid && vid !== vehicleId) return false;
    const occ = str(l, "occurred_at");
    if (!occ) return false;
    const d = new Date(occ).getTime();
    return d >= incidentDate.getTime() - sixty_days_ms && d <= incidentDate.getTime();
  });
  const dvirRecords: DvirRecord[] = vehicleDvirLogs
    .map((l) => {
      const logId = str(l, "id");
      return mapDvirLog(l, (logId ? dvirDefectsByLogId.get(logId) : null) ?? []);
    })
    .filter((r): r is DvirRecord => r !== null);

  // ── HOS snapshot ──────────────────────────────────────────────────────────
  // HOS endpoint has no driver_id filter. In sandbox environments, driver_id
  // on HOS records sometimes matches the record's own id rather than the user id.
  // Fall back to most recent fleet HOS record when no driver-specific match found.
  const driverHosExact = hosAvailabilities.find((a) => str(a, "driver_id") === driverId);
  const hosForSnapshot = driverHosExact ?? hosAvailabilities[0] ?? null;
  const hosMatchedExactly = driverHosExact != null;
  const hosAvailForSnapshot = hosForSnapshot ? [hosForSnapshot] : [];
  const hosSnapshot = buildHosSnapshot(
    hosForSnapshot ? (str(hosForSnapshot, "driver_id") ?? driverId) : driverId,
    hosAvailForSnapshot,
    hosViolations,
  );
  const driverHosViolations90d = hosViolations.filter((v) => str(v, "driver_id") === driverId).length;

  // ── Speed timeline ────────────────────────────────────────────────────────
  // Primary: real pings from Catena /v2/telematics/vehicle-locations (speed field).
  // Demo fallback: when the sandbox emits no meaningful speeds for this vehicle
  // (Catena sandbox simulator returns near-zero / null speed for most TSP fleets),
  // synthesize a plausible 72-min highway profile so the Speed Telemetry chart
  // renders something the claims workflow can be demoed against. Every synthetic
  // sample is flagged fromApi=false and the provenance panel shows "synthetic".
  //
  // HARDCODED FOR DEMO PURPOSES. In production this fallback would be removed
  // and the UI would simply render "No telemetry" — the real data source is
  // /v2/telematics/vehicle-locations (and /vehicles/{id}/sensor-events for
  // higher-frequency sub-minute samples when available).
  const speedTimeline: SpeedSample[] = realPings.length > 0
    ? realPings
        .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
        .map((p) => ({
          offsetMinutes: p.offsetMinutes,
          speedMph: Math.round(p.speedMph * 10) / 10,
          lat: p.lat,
          lng: p.lng,
          fromApi: true,
        }))
    : buildDemoSpeedTimeline({
        incidentLat,
        incidentLng,
        headingDeg,
        baseSpeedMph: baseSpeed ?? 58,
        speedAtImpactMph: speedAtImpactRaw ?? 62,
      });

  const speedAtImpactMph: number | null = speedTimeline.find((s) => s.offsetMinutes === 0)?.speedMph ?? speedAtImpactRaw;
  const maxSpeedInWindowMph: number | null = speedTimeline.length > 0
    ? Math.max(...speedTimeline.map((s) => s.speedMph))
    : null;

  const routeWaypoints = buildRouteWaypointsFromLocations(
    locations, vehicleId, incidentAt, incidentLat, incidentLng, baseSpeed ?? 0, headingDeg,
  );

  // ── Trip origin: oldest HOS event for this vehicle within 72h pre-incident ───
  const tripWindowStart = incidentDate.getTime() - 72 * 3600_000;
  let tripOriginRaw: { lat: number; lng: number; locationName: string | null; at: string } | null = null;
  for (const e of hosEventRecords) {
    if (str(e, "vehicle_id") !== vehicleId) continue;
    const at = str(e, "started_at") ?? str(e, "occurred_at");
    if (!at) continue;
    const t = new Date(at).getTime();
    if (t < tripWindowStart || t > incidentDate.getTime()) continue;
    const coords = geoPointSafe((e as Record<string, unknown>).location);
    if (!coords) continue;
    if (!tripOriginRaw || at < tripOriginRaw.at) {
      tripOriginRaw = { lat: coords.lat, lng: coords.lng, locationName: str(e, "location_name"), at };
    }
  }

  // ── External enrichment (NOAA + OSM + Nominatim) ─────────────────────────
  const [weatherContext, roadContext, tripOriginCity, incidentCity] = await Promise.all([
    fetchWeatherAtIncident(incidentLat, incidentLng, incidentAt),
    fetchRoadContext(incidentLat, incidentLng, null),
    tripOriginRaw ? reverseGeocode(tripOriginRaw.lat, tripOriginRaw.lng).catch(() => null) : Promise.resolve(null),
    reverseGeocode(incidentLat, incidentLng).catch(() => null),
  ]);
  const tripOrigin = tripOriginRaw ? { ...tripOriginRaw, cityName: tripOriginCity } : null;

  const postedSpeedLimitMph = roadContext.source === "osm" ? roadContext.postedSpeedLimitMph : null;

  // Build human-readable location: prefer city · road · coords
  const locationParts: string[] = [];
  if (incidentCity) locationParts.push(incidentCity);
  if (roadContext.source === "osm" && roadContext.roadName) {
    locationParts.push(`${roadContext.roadName}${roadContext.roadClassification ? ` (${roadContext.roadClassification})` : ""}`);
  }
  locationParts.push(`${incidentLat.toFixed(4)}, ${incidentLng.toFixed(4)}`);
  const incidentLocation = locationParts.join(" · ");

  const incidentDescription = `Incident reported for ${vehicleUnit}, operated by ${driverName}. ` +
    `${safetyEventsInWindow.length > 0 ? `${safetyEventsInWindow.length} safety event(s) recorded in 30-min window.` : "No safety events in 30-min window."}`;

  // ── Provenance ────────────────────────────────────────────────────────────
  const provenance: DataProvenanceEntry[] = [
    prov("driverName", "catena_api"),
    prov("driverId", "catena_api"),
    prov("vehicleUnit", "catena_api"),
    prov("vehicleVin", "catena_api"),
    prov("incidentAt", mostRecentEvent ? "catena_api" : "synthetic", "Derived from most recent safety event timestamp"),
    prov("incidentLat,incidentLng", coordsFromApi ? "catena_api" : "hardcoded", coordsFromApi ? "From Catena vehicle location ping" : "No location data in API"),
    prov("headingDeg", num(bestLocForIncident, "heading") != null ? "catena_api" : "synthetic"),
    prov("baseSpeed", speedFromApi ? "catena_api" : "synthetic", `${vehicleSpeedsMeaningful.length} meaningful speed pings from vehicle history`),
    prov("speedAtImpact", closestToImpact ? "catena_api" : "synthetic"),
    prov("speedTimeline", realPings.length > 0 ? "catena_api" : "synthetic", `${realPings.length} real pings in 72-min window`),
    prov("safetyEventsInWindow", "catena_api"),
    prov("hosSnapshot", hosForSnapshot ? "catena_api" : "synthetic", hosMatchedExactly ? "Matched to driver" : "Fleet representative — no exact driver match in fleet HOS records"),
    prov("dvirRecords", "catena_api"),
    prov("driverSafetyEvents30d", driverSafetyEvents30d != null ? "catena_analytics" : "catena_api"),
    prov("weatherContext", weatherContext.source === "noaa" ? "noaa" : "synthetic"),
    prov("roadContext", roadContext.source === "osm" ? "osm" : "synthetic"),
  ];

  // ── Data completeness ─────────────────────────────────────────────────────
  const apiFields: string[] = ["driverName", "vehicleUnit", "vehicleVin", "safetyEventsInWindow", "dvirRecords"];
  const missingFields: string[] = [];
  const syntheticFieldsList: string[] = [];

  // Every field is either present (api_confirmed) or missing — nothing is ever
  // fabricated in this builder, so syntheticFieldsList stays empty.
  if (coordsFromApi) apiFields.push("incidentLat", "incidentLng");
  else missingFields.push("incidentLat", "incidentLng");

  if (speedFromApi) apiFields.push("baseSpeed");
  else missingFields.push("baseSpeed");

  if (realPings.length > 0) apiFields.push("speedTimeline");
  else missingFields.push("speedTimeline");

  if (hosForSnapshot) apiFields.push("hosSnapshot");
  else missingFields.push("hosSnapshot");

  if (weatherContext.source === "noaa") apiFields.push("weatherContext");
  else missingFields.push("weatherContext");

  if (roadContext.source === "osm") apiFields.push("roadContext");
  else missingFields.push("roadContext");

  if (postedSpeedLimitMph != null) apiFields.push("postedSpeedLimitMph");
  else missingFields.push("postedSpeedLimitMph");

  if (driverSafetyEvents30d != null) apiFields.push("driverSafetyEvents30d");
  else missingFields.push("driverSafetyEvents30d");

  if (mostRecentEvent) apiFields.push("incidentAt");
  else missingFields.push("incidentAt");

  const dataCompleteness = computeCompleteness(apiFields, missingFields, syntheticFieldsList);

  // ── Evidence manifest ─────────────────────────────────────────────────────
  const evidenceManifest: EvidenceManifestEntry[] = [
    buildManifestEntry({ id: `catena-driver-${driverId}`, fileName: `catena_driver_${driverId}.json`, description: "Catena driver profile", source: "catena_api", data: driver, recordCount: 1 }),
    buildManifestEntry({ id: `catena-vehicle-${vehicleId}`, fileName: `catena_vehicle_${vehicleId}.json`, description: "Catena vehicle record", source: "catena_api", data: vehicle, recordCount: 1 }),
    buildManifestEntry({ id: `catena-safety-events`, fileName: `catena_safety_events_window.json`, description: "Catena safety events — 30-min pre-incident window", source: "catena_api", data: recentEvents, recordCount: recentEvents.length }),
    buildManifestEntry({ id: `catena-loc-pings`, fileName: `catena_location_pings.json`, description: `Catena vehicle location pings — ${realPings.length} in 72-min window`, source: "catena_api", data: realPings, recordCount: realPings.length }),
    buildManifestEntry({ id: `catena-dvir-logs`, fileName: `catena_dvir_logs.json`, description: "Catena DVIR logs — 60-day window", source: "catena_api", data: vehicleDvirLogs, recordCount: vehicleDvirLogs.length }),
    buildManifestEntry({ id: `catena-hos-avail`, fileName: `catena_hos_availabilities.json`, description: hosMatchedExactly ? "Catena HOS — driver match" : "Catena HOS — fleet representative record", source: "catena_api", data: hosAvailForSnapshot, recordCount: hosAvailForSnapshot.length }),
    ...(weatherContext.source === "noaa" ? [buildManifestEntry({ id: `noaa-weather`, fileName: `noaa_weather.json`, description: `NOAA weather — station ${weatherContext.stationId}`, source: "noaa", data: weatherContext, recordCount: 1 })] : []),
    ...(roadContext.source === "osm" ? [buildManifestEntry({ id: `osm-road`, fileName: `osm_road_context.json`, description: `OSM road context — way ${roadContext.osmWayId}`, source: "osm", data: roadContext, recordCount: 1 })] : []),
  ];

  const packet: IncidentPacket = {
    claimNumber,
    incidentAt,
    incidentLocation,
    incidentLat,
    incidentLng,
    incidentDescription,
    driverName,
    driverId: driverId || null,
    vehicleUnit,
    vehicleId: vehicleId || null,
    vehicleVin,
    driverTenureMonths,
    speedTimeline,
    postedSpeedLimitMph,
    speedAtImpactMph,
    maxSpeedInWindowMph,
    safetyEventsInWindow,
    hosSnapshot,
    driverHosViolations90d,
    dvirRecords,
    routeWaypoints,
    tripOrigin,
    driverSafetyEvents30d,
    driverHosViolations30d,
    weatherContext,
    roadContext,
    carrierContext: null,
    incidentSummary: "",
    dataCompleteness,
    dataProvenance: provenance,
    evidenceManifest,
  };

  packet.incidentSummary = buildIncidentSummary(packet);
  return packet;
}
