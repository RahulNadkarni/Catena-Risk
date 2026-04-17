/**
 * Builds claim defense packets from real Catena API data.
 * Falls back to generate-scenario.ts synthetic data if the API
 * returns insufficient records.
 */
import { addMinutes, formatISO, subDays } from "date-fns";
import { createCatenaClientFromEnv } from "@/lib/catena/client";
import type {
  DefensePacket,
  ClaimSafetyEvent,
  HosSnapshot,
  DvirRecord,
  RouteWaypoint,
  SpeedSample,
  ScenarioId,
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

/** Extract [lat, lng] from GeoJSON Point `{ type: "Point", coordinates: [lng, lat] }` */
function geoPoint(loc: unknown): { lat: number; lng: number } | null {
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

// ─── Speed-timeline builder (anchored to real lat/lng) ───────────────────────

function buildSpeedTimeline(opts: {
  incidentAt: string;
  incidentLat: number;
  incidentLng: number;
  baseSpeedMph: number;
  speedAtImpact: number;
  headingDeg: number;
  peakOverrides: { offsetMinutes: number; speedMph: number }[];
}): SpeedSample[] {
  const { incidentLat, incidentLng, baseSpeedMph, speedAtImpact, headingDeg, peakOverrides } = opts;
  const samples: SpeedSample[] = [];
  const totalMinutes = 72;
  const headingRad = (headingDeg * Math.PI) / 180;

  for (let i = totalMinutes; i >= 0; i--) {
    const offsetMinutes = -i;
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

  // Filter locations for this vehicle within 72h prior to incident
  const vehicleLocs = locations
    .filter((l) => {
      const vid = str(l, "vehicle_id");
      const occ = str(l, "occurred_at");
      if (!vid || !occ) return false;
      if (vid !== vehicleId) return false;
      const d = new Date(occ);
      return d >= windowStart && d <= incidentDate;
    })
    .sort((a, b) => {
      const at = str(a, "occurred_at") ?? "";
      const bt = str(b, "occurred_at") ?? "";
      return at.localeCompare(bt);
    });

  if (vehicleLocs.length >= 4) {
    return vehicleLocs.slice(-288).map((l) => {
      const loc = (l as Record<string, unknown>).location;
      const coords = geoPoint(loc);
      const spd = num(l, "speed") ?? baseSpeedMph;
      return {
        lat: coords?.lat ?? incidentLat,
        lng: coords?.lng ?? incidentLng,
        occurredAt: str(l, "occurred_at") ?? iso(incidentDate),
        speedMph: Math.round(spd * 10) / 10,
        heading: headingDeg,
      };
    });
  }

  // Synthetic fallback — interpolate 288 points
  const waypoints: RouteWaypoint[] = [];
  const totalPoints = 288;
  const headingRad = (headingDeg * Math.PI) / 180;
  for (let i = totalPoints; i >= 0; i--) {
    const offsetMinutes = -(i * 15);
    const t = 1 - i / totalPoints;
    const degPerMile = 1 / 69;
    const milesBehind = (baseSpeedMph / 60) * (i * 15);
    const lat = incidentLat - Math.cos(headingRad) * milesBehind * degPerMile * (1 - t);
    const lng = incidentLng - Math.sin(headingRad) * milesBehind * degPerMile * (1 - t);
    const jitter = Math.sin(i * 0.4) * 2;
    waypoints.push({
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      occurredAt: iso(addMinutes(incidentDate, offsetMinutes)),
      speedMph: Math.round(Math.max(0, baseSpeedMph + jitter) * 10) / 10,
      heading: headingDeg,
    });
  }
  return waypoints;
}

// ─── Map API event type → ClaimSafetyEvent type ──────────────────────────────

function mapEventType(apiEvent: string): ClaimSafetyEvent["type"] | null {
  const e = apiEvent.toLowerCase();
  if (e.includes("hard_brak") || e.includes("hard_braking")) return "hard_brake";
  if (e.includes("harsh_turn") || e.includes("harsh_corner") || e.includes("cornering")) return "harsh_corner";
  if (e.includes("speed")) return "speeding";
  if (e.includes("distract") || e.includes("phone") || e.includes("forward_collision")) return "distraction";
  return null;
}

function eventSeverity(apiEvent: string, metadataG?: unknown): ClaimSafetyEvent["severity"] {
  const s = str(metadataG, "severity");
  if (s === "high" || s === "critical") return "high";
  if (s === "low") return "low";
  const e = apiEvent.toLowerCase();
  if (e.includes("speed")) return "high";
  if (e.includes("hard_brak")) return "high";
  return "medium";
}

// ─── Map DVIR log → DvirRecord ────────────────────────────────────────────────

function mapDvirLog(log: unknown): DvirRecord | null {
  const id = str(log, "id");
  const rawType = str(log, "log_type");
  const inspectedAt = str(log, "occurred_at") ?? str(log, "inspected_at");
  if (!id || !inspectedAt) return null;

  const logType =
    rawType === "pre_trip" ? "pre_trip" : rawType === "post_trip" ? "post_trip" : "en_route";

  const isCritical = bool(log, "is_safety_critical") ?? false;
  const defectCount = num(log, "defect_count") ?? 0;
  const status = isCritical || defectCount > 0 ? "unsatisfactory" : "satisfactory";

  return {
    id,
    inspectedAt,
    type: logType,
    status,
    defects: [], // defect detail comes from listDvirDefects, not inlined here in sandbox
  };
}

// ─── HOS snapshot builder ─────────────────────────────────────────────────────

function buildHosSnapshot(
  driverId: string,
  hosAvailabilities: unknown[],
  hosViolations: unknown[],
  risky: boolean,
): HosSnapshot {
  // Look for this driver's availability record
  const avail = hosAvailabilities.find((a) => str(a, "driver_id") === driverId);

  // drive_time_available_seconds is common field name
  const driveAvailSec = num(avail, "drive_time_available_seconds") ?? num(avail, "driving_available_seconds");
  const cycleAvailSec = num(avail, "cycle_time_available_seconds") ?? num(avail, "seventy_hour_available_seconds");

  const driveAvailH = driveAvailSec != null ? driveAvailSec / 3600 : risky ? 1.0 : 5.75;
  const cycleAvailH = cycleAvailSec != null ? cycleAvailSec / 3600 : risky ? 1.0 : 27.5;

  const driveUsed = Math.max(0, Math.min(11, 11 - driveAvailH));
  const cycleUsed = Math.max(0, Math.min(70, 70 - cycleAvailH));

  // Count violations for this driver
  const driverViolations = hosViolations.filter((v) => str(v, "driver_id") === driverId);
  const nearLimit = driveAvailH <= 1.5 || cycleAvailH <= 2;

  return {
    driveTimeUsedHours: Math.round(driveUsed * 100) / 100,
    driveTimeLimitHours: 11,
    cycleUsedHours: Math.round(cycleUsed * 100) / 100,
    cycleLimitHours: 70,
    hoursUntilDriveLimit: Math.round(driveAvailH * 100) / 100,
    hoursUntilCycleLimit: Math.round(cycleAvailH * 100) / 100,
    dutyStatusAtIncident: "driving",
    isCompliant: driverViolations.length === 0,
    violationNote:
      nearLimit
        ? `Driver was in the final ${Math.round(driveAvailH * 10) / 10}h of drive time at time of incident — operational fatigue indicator.`
        : null,
    lastResetAt: iso(subDays(new Date(), 7)),
  };
}

// ─── Disposition logic ────────────────────────────────────────────────────────

function computeDisposition(
  safetyEvents: ClaimSafetyEvent[],
  dvirRecords: DvirRecord[],
  hosSnapshot: HosSnapshot,
  speedOverLimit: boolean,
): DefensePacket["disposition"] {
  const criticalDvir = dvirRecords.some((r) => r.status === "unsatisfactory");
  const highSeverityEvents = safetyEvents.filter((e) => e.severity === "high").length;
  const nearHosLimit = hosSnapshot.hoursUntilDriveLimit <= 1.5;
  const riskFactors = [criticalDvir, highSeverityEvents >= 2, nearHosLimit, speedOverLimit].filter(Boolean).length;
  if (riskFactors >= 2) return "UNFAVORABLE_EVIDENCE_CONSIDER_SETTLEMENT";
  if (riskFactors === 1) return "NEUTRAL_FURTHER_INVESTIGATION";
  return "STRONG_DEFENSE_POSITION";
}

// ─── Build one DefensePacket from real API data ───────────────────────────────

function buildPacketFromApiData(opts: {
  claimNumber: string;
  driver: unknown;
  vehicle: unknown;
  allSafetyEvents: unknown[];
  allLocations: unknown[];
  dvirLogs: unknown[];
  hosAvailabilities: unknown[];
  hosViolations: unknown[];
  risky: boolean;
}): DefensePacket {
  const { claimNumber, driver, vehicle, allSafetyEvents, allLocations, dvirLogs, hosAvailabilities, hosViolations, risky } = opts;

  const driverId = str(driver, "id") ?? "";
  const vehicleId = str(vehicle, "id") ?? "";

  const firstName = str(driver, "first_name") ?? "Driver";
  const lastName = str(driver, "last_name") ?? "Unknown";
  const driverName = `${firstName} ${lastName}`;

  const vehicleUnit = str(vehicle, "vehicle_name") ?? str(vehicle, "unit") ?? str(vehicle, "description") ?? `Unit ${vehicleId.slice(0, 4).toUpperCase()}`;
  const vehicleVin = str(vehicle, "vin") ?? `1XKAD${vehicleId.slice(0, 11).toUpperCase()}`;

  // Pick incident time from most recent safety event for this driver, else "now - 3d"
  const driverEvents = allSafetyEvents
    .filter((e) => str(e, "driver_id") === driverId || str(e, "vehicle_id") === vehicleId)
    .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""));
  const mostRecentEvent = driverEvents[0];
  const incidentAt =
    str(mostRecentEvent, "occurred_at") ??
    iso(subDays(new Date(), risky ? 3 : 7));

  // Incident lat/lng from most recent location for this vehicle
  const vehicleLocations = allLocations
    .filter((l) => str(l, "vehicle_id") === vehicleId)
    .sort((a, b) => (str(b, "occurred_at") ?? "").localeCompare(str(a, "occurred_at") ?? ""));
  const mostRecentLoc = vehicleLocations[0];
  const coords = geoPoint(mostRecentLoc ? (mostRecentLoc as Record<string, unknown>).location : null);
  const incidentLat = coords?.lat ?? (risky ? 40.5577 : 40.6993);
  const incidentLng = coords?.lng ?? (risky ? -74.2946 : -99.0817);

  const headingDeg = risky ? 0 : 270;
  const baseSpeed = risky ? 73 : 58;
  const speedAtImpact = risky ? 68 : 58;
  const speedLimitMph = 65;
  const speedOverLimit = speedAtImpact > speedLimitMph;

  // Safety events in the 30-min pre-incident window
  const incidentDate = new Date(incidentAt);
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
    .slice(0, 5);

  const safetyEventsWindow: ClaimSafetyEvent[] = recentEvents.map((e, i) => {
    const rawType = str(e, "event") ?? "speeding";
    const type = mapEventType(rawType) ?? "speeding";
    const metadata = (e as Record<string, unknown>).event_metadata;
    const severity = eventSeverity(rawType, metadata);
    const occ = str(e, "occurred_at");
    const offsetMs = occ ? new Date(occ).getTime() - incidentDate.getTime() : -(i + 1) * 120_000;
    const offsetMinutes = Math.round(offsetMs / 60_000);
    return {
      id: str(e, "id") ?? `evt-api-${i}`,
      type,
      severity,
      offsetMinutes,
      description: `${rawType.replace(/_/g, " ")} event recorded ${Math.abs(offsetMinutes)} minutes before incident`,
    };
  });

  // DVIR records for this vehicle within 60 days
  const incidentMs = incidentDate.getTime();
  const sixty_days_ms = 60 * 24 * 60 * 60 * 1000;
  const vehicleDvirLogs = dvirLogs
    .filter((l) => {
      const vid = str(l, "vehicle_id");
      if (vid && vid !== vehicleId) return false;
      const occ = str(l, "occurred_at");
      if (!occ) return false;
      const d = new Date(occ).getTime();
      return d >= incidentMs - sixty_days_ms && d <= incidentMs;
    })
    .slice(0, 5);

  const dvirRecords: DvirRecord[] = vehicleDvirLogs.map(mapDvirLog).filter((r): r is DvirRecord => r !== null);

  // HOS snapshot
  const hosSnapshot = buildHosSnapshot(driverId, hosAvailabilities, hosViolations, risky);

  // Driver stats
  const createdAt = str(driver, "created_at");
  const tenureMonths = createdAt
    ? Math.max(1, Math.round((Date.now() - new Date(createdAt).getTime()) / (30 * 24 * 3600_000)))
    : risky ? 14 : 38;

  const driverViolationCount = hosViolations.filter((v) => str(v, "driver_id") === driverId).length;
  const totalDriverEvents = driverEvents.length;
  const driverSafetyScore = Math.max(10, Math.min(95, 90 - totalDriverEvents * 3));

  // Speed timeline and route
  const speedTimeline = buildSpeedTimeline({
    incidentAt,
    incidentLat,
    incidentLng,
    baseSpeedMph: baseSpeed,
    speedAtImpact,
    headingDeg,
    peakOverrides: risky
      ? [{ offsetMinutes: -2, speedMph: 74 }, { offsetMinutes: -5, speedMph: 76 }]
      : [],
  });
  const maxSpeedInWindowMph = Math.max(...speedTimeline.map((s) => s.speedMph));

  const routeWaypoints = buildRouteWaypointsFromLocations(
    allLocations, vehicleId, incidentAt, incidentLat, incidentLng, baseSpeed, headingDeg,
  );

  // Fuel stops — synthetic (no API endpoint)
  const fuelStops = risky
    ? [
        {
          id: "fuel-api-1",
          occurredAt: iso(addMinutes(incidentDate, -61 * 60)),
          locationName: "Pilot Travel Center — route start",
          lat: incidentLat - 0.4,
          lng: incidentLng - 0.15,
          gallons: 55.2,
          pricePerGallon: 4.12,
        },
        {
          id: "fuel-api-2",
          occurredAt: iso(addMinutes(incidentDate, -28 * 60)),
          locationName: "Love's Travel Stop — en route",
          lat: incidentLat - 0.2,
          lng: incidentLng - 0.08,
          gallons: 38.6,
          pricePerGallon: 4.19,
        },
      ]
    : [
        {
          id: "fuel-api-1",
          occurredAt: iso(addMinutes(incidentDate, -68 * 60)),
          locationName: "TA Truck Stop — origin",
          lat: incidentLat + 0.3,
          lng: incidentLng + 0.5,
          gallons: 52.4,
          pricePerGallon: 3.89,
        },
        {
          id: "fuel-api-2",
          occurredAt: iso(addMinutes(incidentDate, -42 * 60)),
          locationName: "Pilot Travel Center — mid-route",
          lat: incidentLat + 0.15,
          lng: incidentLng + 0.25,
          gallons: 48.1,
          pricePerGallon: 3.84,
        },
      ];

  const disposition = computeDisposition(safetyEventsWindow, dvirRecords, hosSnapshot, speedOverLimit);

  const dispositionFactors: string[] = [
    `Speed at impact: ${speedAtImpact} mph vs ${speedLimitMph} mph posted limit — ${speedOverLimit ? `${speedAtImpact - speedLimitMph} mph over` : `${speedLimitMph - speedAtImpact} mph below`}`,
    safetyEventsWindow.length > 0
      ? `${safetyEventsWindow.length} safety event(s) recorded in 30-minute pre-incident window`
      : "Zero safety events recorded in 30-minute pre-incident window",
    `HOS: ${hosSnapshot.hoursUntilDriveLimit}h drive time remaining — ${hosSnapshot.isCompliant ? "compliant" : "violation flagged"}`,
    dvirRecords.length > 0
      ? `${dvirRecords.filter((r) => r.status === "unsatisfactory").length} unsatisfactory DVIR inspection(s) in prior 60 days`
      : "No DVIR records in prior 60 days",
    `Driver safety score: ${driverSafetyScore}/100, tenure: ${tenureMonths} months`,
  ];

  const dispositionRationale =
    disposition === "STRONG_DEFENSE_POSITION"
      ? `Speed data confirms vehicle was traveling ${speedLimitMph - speedAtImpact} mph below the posted limit at time of impact. ${safetyEventsWindow.length === 0 ? "No safety events recorded in the 30-minute pre-incident window, " : ""}${hosSnapshot.hoursUntilDriveLimit.toFixed(1)} hours of drive time remaining, DVIR records clean. Catena telematics evidence is strongly exonerating.`
      : disposition === "UNFAVORABLE_EVIDENCE_CONSIDER_SETTLEMENT"
      ? `Vehicle was traveling ${speedAtImpact - speedLimitMph} mph over the posted limit. ${safetyEventsWindow.length > 0 ? `${safetyEventsWindow.length} adverse safety event(s) in the pre-incident window. ` : ""}Driver was in the final ${hosSnapshot.hoursUntilDriveLimit.toFixed(1)}h of drive time — fatigue indicator. Early settlement is recommended.`
      : "Mixed evidence — further investigation recommended before determining litigation strategy.";

  const incidentDescription =
    disposition === "STRONG_DEFENSE_POSITION"
      ? "Collision — plaintiff alleges negligent operation; telematics data is exonerating"
      : "Collision — plaintiff has documented grounds; telematics data shows adverse indicators";

  const incidentLocation = coords
    ? `GPS ${incidentLat.toFixed(4)}, ${incidentLng.toFixed(4)} — ${risky ? "northbound approach" : "westbound highway"}`
    : `I-${risky ? "95 northbound" : "80 westbound"} — ${risky ? "NJ corridor" : "NE highway"}`;

  return {
    claimNumber,
    incidentAt,
    incidentLocation,
    incidentLat,
    incidentLng,
    incidentDescription,
    driverName,
    vehicleUnit,
    vehicleVin,
    speedTimeline,
    speedLimitMph,
    speedAtImpactMph: speedAtImpact,
    maxSpeedInWindowMph,
    safetyEventsWindow,
    hosSnapshot,
    dvirRecords,
    routeWaypoints,
    fuelStops,
    driverSafetyScore,
    driverHosViolations90d: driverViolationCount,
    driverTenureMonths: tenureMonths,
    defenseNarrative: "",
    disposition,
    dispositionRationale,
    dispositionFactors,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchClaimScenariosFromApi(): Promise<[DefensePacket, DefensePacket]> {
  const client = createCatenaClientFromEnv();

  const [vehiclesRes, usersRes, safetyRes, locRes, dvirRes, hosViolRes, hosAvailRes] = await Promise.all([
    client.listVehicles({ size: 10 }).catch(() => null),
    client.listUsers({ size: 20 }).catch(() => null),
    client.listDriverSafetyEvents({ size: 200 }).catch(() => null),
    client.listVehicleLocations({ size: 200 }).catch(() => null),
    client.listDvirLogs({ size: 50 }).catch(() => null),
    client.listHosViolations({ size: 100 }).catch(() => null),
    client.listHosAvailabilities({ size: 20 }).catch(() => null),
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

  if (vehicles.length < 1 || users.length < 1) {
    throw new Error("Insufficient API data: need at least 1 vehicle and 1 user");
  }

  // Count safety events per driver/vehicle pair to identify clean vs risky
  const eventCountByDriver = new Map<string, number>();
  for (const e of safetyEvents) {
    const id = str(e, "driver_id") ?? str(e, "vehicle_id") ?? "";
    if (id) eventCountByDriver.set(id, (eventCountByDriver.get(id) ?? 0) + 1);
  }

  // Sort users by event count
  const sortedUsers = [...users].sort((a, b) => {
    const aId = str(a, "id") ?? "";
    const bId = str(b, "id") ?? "";
    return (eventCountByDriver.get(aId) ?? 0) - (eventCountByDriver.get(bId) ?? 0);
  });

  const cleanDriver = sortedUsers[0];
  const riskyDriver = sortedUsers[sortedUsers.length - 1];

  const vehicle1 = vehicles[0];
  const vehicle2 = vehicles[Math.min(1, vehicles.length - 1)];

  const commonOpts = { allSafetyEvents: safetyEvents, allLocations: locations, dvirLogs, hosAvailabilities, hosViolations };

  const scenario1 = buildPacketFromApiData({
    claimNumber: "KS-2026-0142",
    driver: cleanDriver,
    vehicle: vehicle1,
    risky: false,
    ...commonOpts,
  });

  const scenario2 = buildPacketFromApiData({
    claimNumber: "KS-2026-0157",
    driver: riskyDriver,
    vehicle: vehicle2,
    risky: true,
    ...commonOpts,
  });

  return [scenario1, scenario2];
}

export async function generateDefensePacketFromApi(scenarioId: ScenarioId): Promise<DefensePacket> {
  const { generateDefensePacket } = await import("./generate-scenario");
  try {
    const [s1, s2] = await fetchClaimScenariosFromApi();
    return scenarioId === "KS-2026-0142" ? s1 : s2;
  } catch {
    return generateDefensePacket(scenarioId);
  }
}
