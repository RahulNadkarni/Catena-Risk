/**
 * Synthetic IncidentPackets for demo/fallback purposes.
 * All fields clearly marked as synthetic in dataProvenance and dataCompleteness.
 */
import { addMinutes, formatISO } from "date-fns";
import { buildIncidentSummary } from "./narrative";
import type {
  IncidentPacket,
  SpeedSample,
  ClaimSafetyEvent,
  HosSnapshot,
  DvirRecord,
  DvirDefect,
  RouteWaypoint,
  ScenarioId,
  DataProvenanceEntry,
  DataCompleteness,
} from "./types";

function makeId(prefix: string, n: number): string {
  return `${prefix}-${n.toString(16).padStart(8, "0")}`;
}

function iso(date: Date): string {
  return formatISO(date, { representation: "complete" });
}

function isoOffset(baseIso: string, offsetMinutes: number): string {
  return iso(addMinutes(new Date(baseIso), offsetMinutes));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function buildSpeedTimeline(opts: {
  incidentAt: string;
  baseSpeedMph: number;
  peakOverrides: { offsetMinutes: number; speedMph: number }[];
  incidentLat: number;
  incidentLng: number;
  headingDeg: number;
  speedAtImpact: number;
}): SpeedSample[] {
  const { baseSpeedMph, peakOverrides, incidentLat, incidentLng, headingDeg, speedAtImpact } = opts;
  const samples: SpeedSample[] = [];
  const totalMinutes = 72;
  const headingRad = (headingDeg * Math.PI) / 180;

  for (let i = totalMinutes; i >= 0; i--) {
    const offsetMinutes = -i;
    const t = (totalMinutes - i) / totalMinutes;
    const jitter = Math.sin(i * 0.7) * 2;
    let speed = baseSpeedMph + jitter;
    for (const ov of peakOverrides) {
      const dist = Math.abs(offsetMinutes - ov.offsetMinutes);
      if (dist <= 3) speed = lerp(speed, ov.speedMph, 1 - dist / 3);
    }
    if (i <= 5) speed = lerp(speed, speedAtImpact, (5 - i) / 5);
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
    void t;
  }
  return samples;
}

function buildRouteWaypoints(opts: {
  incidentAt: string;
  incidentLat: number;
  incidentLng: number;
  originLat: number;
  originLng: number;
  baseSpeedMph: number;
  headingDeg: number;
}): RouteWaypoint[] {
  const { incidentAt, incidentLat, incidentLng, originLat, originLng, baseSpeedMph, headingDeg } = opts;
  const incidentDate = new Date(incidentAt);
  const waypoints: RouteWaypoint[] = [];
  const totalPoints = 288;

  for (let i = totalPoints; i >= 0; i--) {
    const offsetMinutes = -(i * 15);
    const t = 1 - i / totalPoints;
    const lat = lerp(originLat, incidentLat, t);
    const lng = lerp(originLng, incidentLng, t);
    const jitter = Math.sin(i * 0.4) * 2;
    waypoints.push({
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      occurredAt: iso(addMinutes(incidentDate, offsetMinutes)),
      speedMph: Math.round(Math.max(0, baseSpeedMph + jitter) * 10) / 10,
      heading: headingDeg,
      fromApi: false,
    });
  }
  return waypoints;
}

const SYNTHETIC_PROVENANCE: DataProvenanceEntry[] = [
  { field: "*", source: "synthetic", note: "All fields synthetic — API unavailable or insufficient data" },
];

const SYNTHETIC_COMPLETENESS: DataCompleteness = {
  status: "SYNTHETIC_FALLBACK",
  apiFieldsPresent: [],
  missingFields: [],
  syntheticFields: ["all"],
};

// ─── Scenario 1: KS-2026-0142 (clean record) ─────────────────────────────────

function scenario1(): IncidentPacket {
  const incidentAt = "2026-03-14T14:22:00Z";
  const incidentLat = 40.6993;
  const incidentLng = -99.0817;
  const speedAtImpact = 58;

  const speedTimeline = buildSpeedTimeline({
    incidentAt,
    baseSpeedMph: 58,
    peakOverrides: [],
    incidentLat,
    incidentLng,
    headingDeg: 270,
    speedAtImpact,
  });

  const routeWaypoints = buildRouteWaypoints({
    incidentAt,
    incidentLat,
    incidentLng,
    originLat: 41.2565,
    originLng: -95.9345,
    baseSpeedMph: 58,
    headingDeg: 270,
  });

  const hosSnapshot: HosSnapshot = {
    driveTimeUsedHours: 5.25,
    driveTimeLimitHours: 11,
    cycleUsedHours: 42.5,
    cycleLimitHours: 70,
    hoursUntilDriveLimit: 5.75,
    hoursUntilCycleLimit: 27.5,
    availableShiftHours: null,
    timeUntilBreakHours: null,
    nextBreakDueAt: null,
    dutyStatusAtIncident: "driving",
    isPersonalConveyance: null,
    isCompliant: true,
    violationNote: null,
    lastResetAt: "2026-03-12T06:00:00Z",
    cycleViolationDurationHours: null,
  };

  const dvirRecords: DvirRecord[] = [
    { id: makeId("dvir", 1), inspectedAt: isoOffset(incidentAt, -5 * 24 * 60), type: "pre_trip", status: "satisfactory", defects: [], vehicleId: null, location: null },
    { id: makeId("dvir", 2), inspectedAt: isoOffset(incidentAt, -21 * 24 * 60), type: "post_trip", status: "satisfactory", defects: [], vehicleId: null, location: null },
    { id: makeId("dvir", 3), inspectedAt: isoOffset(incidentAt, -48 * 24 * 60), type: "pre_trip", status: "satisfactory", defects: [], vehicleId: null, location: null },
  ];

  const maxSpeed = Math.max(...speedTimeline.map((s) => s.speedMph));

  const packet: IncidentPacket = {
    claimNumber: "KS-2026-0142",
    incidentAt,
    incidentLocation: "I-80 westbound MM 312, Kearney NE",
    incidentLat,
    incidentLng,
    incidentDescription: "Rear-end collision at MM 312 westbound — plaintiff alleges speeding",
    driverName: "Marcus T. Walcott",
    driverId: null,
    vehicleUnit: "Unit 2841",
    vehicleId: null,
    vehicleVin: "1XKAD49X8NJ123847",
    driverTenureMonths: 38,
    speedTimeline,
    postedSpeedLimitMph: 65,
    speedAtImpactMph: speedAtImpact,
    maxSpeedInWindowMph: maxSpeed,
    safetyEventsInWindow: [],
    hosSnapshot,
    driverHosViolations90d: 0,
    dvirRecords,
    routeWaypoints,
    tripOrigin: null,
    driverSafetyEvents30d: 2,
    driverHosViolations30d: 0,
    weatherContext: null,
    roadContext: null,
    carrierContext: null,
    incidentSummary: "",
    dataCompleteness: SYNTHETIC_COMPLETENESS,
    dataProvenance: SYNTHETIC_PROVENANCE,
    evidenceManifest: [],
  };

  packet.incidentSummary = buildIncidentSummary(packet);
  return packet;
}

// ─── Scenario 2: KS-2026-0157 (adverse indicators) ───────────────────────────

function scenario2(): IncidentPacket {
  const incidentAt = "2026-03-21T09:47:00Z";
  const incidentLat = 40.5577;
  const incidentLng = -74.2946;
  const speedAtImpact = 68;

  const speedTimeline = buildSpeedTimeline({
    incidentAt,
    baseSpeedMph: 73,
    peakOverrides: [
      { offsetMinutes: -2, speedMph: 74 },
      { offsetMinutes: -5, speedMph: 76 },
    ],
    incidentLat,
    incidentLng,
    headingDeg: 0,
    speedAtImpact,
  });

  const routeWaypoints = buildRouteWaypoints({
    incidentAt,
    incidentLat,
    incidentLng,
    originLat: 39.9526,
    originLng: -75.1652,
    baseSpeedMph: 73,
    headingDeg: 0,
  });

  const safetyEvents: ClaimSafetyEvent[] = [
    {
      id: makeId("evt", 1),
      type: "hard_brake",
      severity: "high",
      offsetMinutes: -2,
      description: "Peak deceleration 0.42g — 2 minutes before impact",
      rawEventType: "hard_braking",
    },
    {
      id: makeId("evt", 2),
      type: "harsh_corner",
      severity: "medium",
      offsetMinutes: -1,
      description: "Lateral event 0.31g — lane change 30 seconds before impact",
      rawEventType: "harsh_corner",
    },
  ];

  const hosSnapshot: HosSnapshot = {
    driveTimeUsedHours: 10.0,
    driveTimeLimitHours: 11,
    cycleUsedHours: 69.0,
    cycleLimitHours: 70,
    hoursUntilDriveLimit: 1.0,
    hoursUntilCycleLimit: 1.0,
    availableShiftHours: null,
    timeUntilBreakHours: null,
    nextBreakDueAt: null,
    dutyStatusAtIncident: "driving",
    isPersonalConveyance: null,
    isCompliant: true,
    violationNote:
      "Driver had 1.0h drive time remaining and 1.0h cycle time remaining at incident time.",
    lastResetAt: "2026-03-14T22:00:00Z",
    cycleViolationDurationHours: null,
  };

  const brakeDefect1: DvirDefect = {
    id: makeId("def", 1),
    component: "Service brake system — front axle pad wear",
    severity: "critical",
    resolvedAt: null,
    resolvedByName: null,
    note: "Brake pad wear beyond service limit.",
  };
  const brakeDefect2: DvirDefect = {
    id: makeId("def", 2),
    component: "Brake adjustment — rear axle",
    severity: "critical",
    resolvedAt: null,
    resolvedByName: null,
    note: "Out-of-adjustment brake on post-trip walk-around.",
  };

  const dvirRecords: DvirRecord[] = [
    { id: makeId("dvir", 11), inspectedAt: isoOffset(incidentAt, -22 * 24 * 60), type: "post_trip", status: "unsatisfactory", defects: [brakeDefect1], vehicleId: null, location: null },
    { id: makeId("dvir", 12), inspectedAt: isoOffset(incidentAt, -8 * 24 * 60), type: "pre_trip", status: "unsatisfactory", defects: [brakeDefect2], vehicleId: null, location: null },
    { id: makeId("dvir", 13), inspectedAt: isoOffset(incidentAt, -3 * 24 * 60), type: "pre_trip", status: "satisfactory", defects: [], vehicleId: null, location: null },
  ];

  const maxSpeed = Math.max(...speedTimeline.map((s) => s.speedMph));

  const packet: IncidentPacket = {
    claimNumber: "KS-2026-0157",
    incidentAt,
    incidentLocation: "I-95 northbound MM 11.2, Woodbridge NJ",
    incidentLat,
    incidentLng,
    incidentDescription: "Lane change incident on I-95 northbound",
    driverName: "Devon R. Castillo",
    driverId: null,
    vehicleUnit: "Unit 1174",
    vehicleId: null,
    vehicleVin: "3AKJGLD57FSGF9241",
    driverTenureMonths: 14,
    speedTimeline,
    postedSpeedLimitMph: 65,
    speedAtImpactMph: speedAtImpact,
    maxSpeedInWindowMph: maxSpeed,
    safetyEventsInWindow: safetyEvents,
    hosSnapshot,
    driverHosViolations90d: 7,
    dvirRecords,
    routeWaypoints,
    tripOrigin: null,
    driverSafetyEvents30d: 11,
    driverHosViolations30d: 7,
    weatherContext: null,
    roadContext: null,
    carrierContext: null,
    incidentSummary: "",
    dataCompleteness: SYNTHETIC_COMPLETENESS,
    dataProvenance: SYNTHETIC_PROVENANCE,
    evidenceManifest: [],
  };

  packet.incidentSummary = buildIncidentSummary(packet);
  return packet;
}

export function generateIncidentPacket(scenarioId: ScenarioId): IncidentPacket {
  if (scenarioId === "KS-2026-0142") return scenario1();
  return scenario2();
}
