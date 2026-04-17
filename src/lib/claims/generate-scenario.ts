import { addMinutes, formatISO } from "date-fns";
import type {
  DefensePacket,
  SpeedSample,
  ClaimSafetyEvent,
  HosSnapshot,
  DvirRecord,
  DvirDefect,
  SyntheticFuelStop,
  RouteWaypoint,
  ScenarioId,
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

/** Build 72 speed samples (1-min intervals) ending at incident (offsetMinutes = 0). */
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

  for (let i = totalMinutes; i >= 0; i--) {
    const offsetMinutes = -i;
    const t = (totalMinutes - i) / totalMinutes;
    // Gentle sine wave jitter for realism
    const jitter = Math.sin(i * 0.7) * 2;
    let speed = baseSpeedMph + jitter;

    // Apply overrides (nearest minute)
    for (const ov of peakOverrides) {
      const dist = Math.abs(offsetMinutes - ov.offsetMinutes);
      if (dist <= 3) {
        const blend = 1 - dist / 3;
        speed = lerp(speed, ov.speedMph, blend);
      }
    }

    // Blend to speedAtImpact in final 5 minutes
    if (i <= 5) {
      speed = lerp(speed, speedAtImpact, (5 - i) / 5);
    }

    // Interpolate lat/lng backward along heading
    const headingRad = (headingDeg * Math.PI) / 180;
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
    void t;
  }

  return samples;
}

/** Build 288 route waypoints (one per 15 min, 72h prior to incident). */
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
  const totalPoints = 288; // 72h × 4 per hour

  for (let i = totalPoints; i >= 0; i--) {
    const offsetMinutes = -(i * 15);
    const t = 1 - i / totalPoints;
    const lat = lerp(originLat, incidentLat, t);
    const lng = lerp(originLng, incidentLng, t);
    const jitter = Math.sin(i * 0.4) * 2;
    const speed = Math.max(0, baseSpeedMph + jitter);
    const occurredAt = addMinutes(incidentDate, offsetMinutes);

    waypoints.push({
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      occurredAt: iso(occurredAt),
      speedMph: Math.round(speed * 10) / 10,
      heading: headingDeg,
    });
  }

  return waypoints;
}

// ─── Scenario 1: KS-2026-0142 (Exonerating) ───────────────────────────────

function scenario1(): DefensePacket {
  const incidentAt = "2026-03-14T14:22:00Z";
  const incidentLat = 40.6993;
  const incidentLng = -99.0817;
  const speedLimitMph = 65;
  const baseSpeed = 58;
  const speedAtImpact = 58;

  const speedTimeline = buildSpeedTimeline({
    incidentAt,
    baseSpeedMph: baseSpeed,
    peakOverrides: [],
    incidentLat,
    incidentLng,
    headingDeg: 270, // westbound
    speedAtImpact,
  });

  const routeWaypoints = buildRouteWaypoints({
    incidentAt,
    incidentLat,
    incidentLng,
    originLat: 41.2565, // Omaha area
    originLng: -95.9345,
    baseSpeedMph: baseSpeed,
    headingDeg: 270,
  });

  const hosSnapshot: HosSnapshot = {
    driveTimeUsedHours: 5.25,
    driveTimeLimitHours: 11,
    cycleUsedHours: 42.5,
    cycleLimitHours: 70,
    hoursUntilDriveLimit: 5.75,
    hoursUntilCycleLimit: 27.5,
    dutyStatusAtIncident: "driving",
    isCompliant: true,
    violationNote: null,
    lastResetAt: "2026-03-12T06:00:00Z",
  };

  const dvirRecords: DvirRecord[] = [
    {
      id: makeId("dvir", 1),
      inspectedAt: isoOffset(incidentAt, -5 * 24 * 60),
      type: "pre_trip",
      status: "satisfactory",
      defects: [],
    },
    {
      id: makeId("dvir", 2),
      inspectedAt: isoOffset(incidentAt, -21 * 24 * 60),
      type: "post_trip",
      status: "satisfactory",
      defects: [],
    },
    {
      id: makeId("dvir", 3),
      inspectedAt: isoOffset(incidentAt, -48 * 24 * 60),
      type: "pre_trip",
      status: "satisfactory",
      defects: [],
    },
  ];

  const fuelStops: SyntheticFuelStop[] = [
    {
      id: makeId("fuel", 1),
      occurredAt: isoOffset(incidentAt, -68 * 60),
      locationName: "TA Truck Stop — Omaha NE",
      lat: 41.2193,
      lng: -95.9722,
      gallons: 52.4,
      pricePerGallon: 3.89,
    },
    {
      id: makeId("fuel", 2),
      occurredAt: isoOffset(incidentAt, -42 * 60),
      locationName: "Pilot Travel Center — Grand Island NE",
      lat: 40.9256,
      lng: -98.3583,
      gallons: 48.1,
      pricePerGallon: 3.84,
    },
    {
      id: makeId("fuel", 3),
      occurredAt: isoOffset(incidentAt, -18 * 60),
      locationName: "Love's Travel Stop — North Platte NE",
      lat: 41.1281,
      lng: -100.7654,
      gallons: 41.7,
      pricePerGallon: 3.81,
    },
  ];

  const maxSpeed = Math.max(...speedTimeline.map((s) => s.speedMph));

  const dispositionFactors = [
    `Speed at impact: ${speedAtImpact} mph vs ${speedLimitMph} mph posted limit — ${speedLimitMph - speedAtImpact} mph below`,
    "Zero safety events recorded in 30-minute pre-incident window",
    `HOS: ${hosSnapshot.hoursUntilDriveLimit}h drive time remaining — fully compliant`,
    "All DVIR inspections satisfactory with zero open defects",
    "Driver safety score: 87/100, tenure: 38 months — experienced operator",
  ];

  return {
    claimNumber: "KS-2026-0142",
    incidentAt,
    incidentLocation: "I-80 westbound MM 312, Kearney NE",
    incidentLat,
    incidentLng,
    incidentDescription: "Rear-end collision — plaintiff alleges truck was speeding",
    driverName: "Marcus T. Walcott",
    vehicleUnit: "Unit 2841",
    vehicleVin: "1XKAD49X8NJ123847",
    speedTimeline,
    speedLimitMph,
    speedAtImpactMph: speedAtImpact,
    maxSpeedInWindowMph: maxSpeed,
    safetyEventsWindow: [],
    hosSnapshot,
    dvirRecords,
    routeWaypoints,
    fuelStops,
    driverSafetyScore: 87,
    driverHosViolations90d: 0,
    driverTenureMonths: 38,
    defenseNarrative: "", // populated after construction
    disposition: "STRONG_DEFENSE_POSITION",
    dispositionRationale:
      "Speed data confirms vehicle was traveling 7 mph below the posted limit at time of impact. No safety events recorded in the 30-minute pre-incident window, 5.75 hours of drive time remaining, and all DVIR inspections clean. Telematics evidence is strongly exonerating.",
    dispositionFactors,
  };
}

// ─── Scenario 2: KS-2026-0157 (Inculpating) ──────────────────────────────

function scenario2(): DefensePacket {
  const incidentAt = "2026-03-21T09:47:00Z";
  const incidentLat = 40.5577;
  const incidentLng = -74.2946;
  const speedLimitMph = 65;
  const baseSpeed = 73;
  const speedAtImpact = 68;

  const speedTimeline = buildSpeedTimeline({
    incidentAt,
    baseSpeedMph: baseSpeed,
    peakOverrides: [
      { offsetMinutes: -2, speedMph: 74 }, // hard brake moment
      { offsetMinutes: -5, speedMph: 76 }, // peak speed
    ],
    incidentLat,
    incidentLng,
    headingDeg: 0, // northbound
    speedAtImpact,
  });

  const routeWaypoints = buildRouteWaypoints({
    incidentAt,
    incidentLat,
    incidentLng,
    originLat: 39.9526, // Philadelphia area
    originLng: -75.1652,
    baseSpeedMph: baseSpeed,
    headingDeg: 0,
  });

  const safetyEvents: ClaimSafetyEvent[] = [
    {
      id: makeId("evt", 1),
      type: "hard_brake",
      severity: "high",
      offsetMinutes: -2,
      description: "Peak deceleration 0.42g — recorded 2 minutes before impact",
    },
    {
      id: makeId("evt", 2),
      type: "harsh_corner",
      severity: "medium",
      offsetMinutes: -0.5,
      description: "Lateral event 0.31g — lane change maneuver 30 seconds before impact",
    },
  ];

  const hosSnapshot: HosSnapshot = {
    driveTimeUsedHours: 10.0,
    driveTimeLimitHours: 11,
    cycleUsedHours: 69.0,
    cycleLimitHours: 70,
    hoursUntilDriveLimit: 1.0,
    hoursUntilCycleLimit: 1.0,
    dutyStatusAtIncident: "driving",
    isCompliant: true, // technically legal but operationally fatigued
    violationNote:
      "Driver was in the final hour of both the 11-hour drive limit and the 70-hour cycle limit simultaneously at time of incident — operational fatigue indicator.",
    lastResetAt: "2026-03-14T22:00:00Z",
  };

  // 2 critical unresolved brake defects
  const brakeDefect1: DvirDefect = {
    id: makeId("def", 1),
    component: "Service brake system — front axle pad wear",
    severity: "critical",
    resolvedAt: null,
    resolvedByName: null,
    note: "Brake pad wear beyond service limit. Flagged for replacement.",
  };
  const brakeDefect2: DvirDefect = {
    id: makeId("def", 2),
    component: "Brake adjustment — rear axle",
    severity: "critical",
    resolvedAt: null,
    resolvedByName: null,
    note: "Out-of-adjustment brake detected on post-trip walk-around.",
  };

  const dvirRecords: DvirRecord[] = [
    {
      id: makeId("dvir", 11),
      inspectedAt: isoOffset(incidentAt, -22 * 24 * 60),
      type: "post_trip",
      status: "unsatisfactory",
      defects: [brakeDefect1],
    },
    {
      id: makeId("dvir", 12),
      inspectedAt: isoOffset(incidentAt, -8 * 24 * 60),
      type: "pre_trip",
      status: "unsatisfactory",
      defects: [brakeDefect2],
    },
    {
      id: makeId("dvir", 13),
      inspectedAt: isoOffset(incidentAt, -3 * 24 * 60),
      type: "pre_trip",
      status: "satisfactory",
      defects: [],
    },
  ];

  const fuelStops: SyntheticFuelStop[] = [
    {
      id: makeId("fuel", 11),
      occurredAt: isoOffset(incidentAt, -61 * 60),
      locationName: "Pilot Travel Center — Camden NJ",
      lat: 39.9425,
      lng: -75.1163,
      gallons: 55.2,
      pricePerGallon: 4.12,
    },
    {
      id: makeId("fuel", 12),
      occurredAt: isoOffset(incidentAt, -28 * 60),
      locationName: "Shell — Edison NJ",
      lat: 40.5188,
      lng: -74.3652,
      gallons: 38.6,
      pricePerGallon: 4.19,
    },
  ];

  const maxSpeed = Math.max(...speedTimeline.map((s) => s.speedMph));

  const dispositionFactors = [
    `Speed at impact: ${speedAtImpact} mph vs ${speedLimitMph} mph limit — ${speedAtImpact - speedLimitMph} mph over posted speed`,
    "Hard brake event (0.42g peak deceleration) recorded 2 minutes before impact",
    "Harsh cornering/lane-change event (0.31g) recorded 30 seconds before impact",
    `Driver in final hour of 11-hour drive limit at time of incident`,
    `Driver in final hour of 70-hour cycle — dual fatigue indicator`,
    "2 unresolved critical brake defects: 22 days and 8 days prior to incident",
    "Driver safety score: 41/100 — significantly below fleet average",
  ];

  return {
    claimNumber: "KS-2026-0157",
    incidentAt,
    incidentLocation: "I-95 northbound MM 11.2, Woodbridge NJ",
    incidentLat,
    incidentLng,
    incidentDescription: "Lane change incident — plaintiff has documented grounds for liability",
    driverName: "Devon R. Castillo",
    vehicleUnit: "Unit 1174",
    vehicleVin: "3AKJGLD57FSGF9241",
    speedTimeline,
    speedLimitMph,
    speedAtImpactMph: speedAtImpact,
    maxSpeedInWindowMph: maxSpeed,
    safetyEventsWindow: safetyEvents,
    hosSnapshot,
    dvirRecords,
    routeWaypoints,
    fuelStops,
    driverSafetyScore: 41,
    driverHosViolations90d: 7,
    driverTenureMonths: 14,
    defenseNarrative: "", // populated after construction
    disposition: "UNFAVORABLE_EVIDENCE_CONSIDER_SETTLEMENT",
    dispositionRationale:
      "Vehicle was traveling 3–11 mph over the posted speed limit. A documented hard brake event 2 minutes prior and a harsh cornering event 30 seconds prior indicate aggressive operation. The driver was in the final hour of both drive time and 70-hour cycle limits — a dual fatigue indicator. Two unresolved critical brake defects from inspections 22 and 8 days prior create substantial vehicle-maintenance liability. Early settlement is recommended.",
    dispositionFactors,
  };
}

export function generateDefensePacket(scenarioId: ScenarioId): DefensePacket {
  if (scenarioId === "KS-2026-0142") return scenario1();
  return scenario2();
}
