import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import type { FleetDossier } from "./fleet-dossier";
import {
  CANONICAL_SAFETY_CATEGORY,
  mapRawSafetyEventToCanonical,
} from "./safety-event-taxonomy";
import type { VehicleLocationRead } from "../catena/types";

/**
 * Exposure aggregates used for insurance-style denominators.
 *
 * Miles: we infer distance from sorted `odometer` deltas on vehicle locations and assume
 * odometer is in **miles** (Catena samples label units as nullable; if your tenant uses km,
 * convert before interpreting `totalMiles`).
 *
 * Engine hours: we take the latest non-null `engine_hours` per vehicle (max) and sum —
 * engine hours are cumulative in most TSPs; this is an approximate fleet total with ambiguity
 * when snapshots are sparse.
 */
export interface ExposureMetrics {
  totalMiles: number;
  totalEngineHours: number | null;
  totalDrivingDays: number;
  activeDriverCount: number;
  activeVehicleCount: number;
  /** Share of telematics pings (locations) in 22:00–05:00 local window */
  nightDrivingPct: number | null;
  /** Share of telematics pings on Sat/Sun local */
  weekendDrivingPct: number | null;
  /** Heuristic urban share when no region segment endpoint exists */
  urbanDrivingPct: number | null;
}

export interface BehaviorRates {
  hardBrakingPer1k: number;
  hardAccelPer1k: number;
  corneringPer1k: number;
  speedingPer1k: number;
  hosViolationsPerDriverMonth: number;
  /** Critical-severity DVIR defects per 100 DVIR records */
  criticalDvirDefectRate: number | null;
  /** Only when defects expose numeric severity / scores */
  meanSeverityScore: number | null;
}

function groupByVehicle(locations: VehicleLocationRead[]): Record<string, VehicleLocationRead[]> {
  const m: Record<string, VehicleLocationRead[]> = {};
  for (const l of locations) {
    const id = l.vehicle_id;
    if (!m[id]) m[id] = [];
    m[id]!.push(l);
  }
  return m;
}

/**
 * Prefer positive odometer deltas between consecutive samples per vehicle.
 * Ignores implausible single-hop spikes (> 2000 mi) as noise.
 */
export function estimateMilesFromOdometerDeltas(locations: VehicleLocationRead[]): number {
  let total = 0;
  const byV = groupByVehicle(locations);
  for (const rows of Object.values(byV)) {
    const sorted = [...rows]
      .filter((r) => r.odometer != null)
      .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1]!.odometer ?? 0;
      const b = sorted[i]!.odometer ?? 0;
      const d = b - a;
      if (d > 0 && d < 2000) total += d;
    }
  }
  return total;
}

function approximateWindowMonths(windowStart: Date, windowEnd: Date): number {
  const days = Math.max(1, differenceInCalendarDays(windowEnd, windowStart) + 1);
  return days / 30.44;
}

function fleetTimeZone(dossier: FleetDossier): string {
  const tz = dossier.hosEvents.map((e) => e.time_zone_code).find((t) => typeof t === "string" && t.length > 0);
  return tz ?? "UTC";
}

function localHourAndWeekday(iso: string, timeZone: string): { hour: number; weekday: number } {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "???";
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour, weekday: map[wd] ?? d.getUTCDay() };
}

// Night = 22:00–05:00 local. HARDCODED policy constant — no Catena API
// defines "night driving." Actuarial definitions vary (22–06, 21–06, 23–05);
// for a real rating model this would come from the internal rating-policy
// service alongside the sub-score weights in src/lib/risk/weights.ts.
function isNightHour(hour: number): boolean {
  return hour >= 22 || hour < 5;
}

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

/** Urban proxy: locations with a populated `inferred_address.city` */
export function computeUrbanDrivingPctFromLocations(dossier: FleetDossier): number | null {
  if (dossier.regionSegments.length) {
    return null;
  }
  const locs = dossier.vehicleLocations;
  if (!locs.length) return null;
  let urban = 0;
  for (const l of locs) {
    const a = l.inferred_address as { city?: string | null } | null | undefined;
    if (a?.city) urban += 1;
  }
  if (urban === 0) return null;
  return urban / locs.length;
}

export function computeExposureMetrics(dossier: FleetDossier): ExposureMetrics {
  const tz = fleetTimeZone(dossier);

  const totalMiles = estimateMilesFromOdometerDeltas(dossier.vehicleLocations);

  let totalEngineHours: number | null = null;
  const byV = groupByVehicle(dossier.vehicleLocations);
  let ehSum = 0;
  let ehCount = 0;
  for (const rows of Object.values(byV)) {
    let maxEh = 0;
    for (const r of rows) {
      if (r.engine_hours != null && r.engine_hours > maxEh) maxEh = r.engine_hours;
    }
    if (maxEh > 0) {
      ehSum += maxEh;
      ehCount += 1;
    }
  }
  if (ehCount > 0) totalEngineHours = ehSum;

  const dayKeys = new Set<string>();
  const addDay = (iso: string) => {
    const d = new Date(iso);
    dayKeys.add(d.toISOString().slice(0, 10));
  };
  for (const l of dossier.vehicleLocations) addDay(l.occurred_at);
  for (const h of dossier.hosEvents) {
    if (
      (typeof h.event_type_code === "string" && /drive/i.test(h.event_type_code)) ||
      (typeof h.duty_status_code === "string" && /drive/i.test(h.duty_status_code))
    ) {
      const t = h.started_at ?? h.occurred_at;
      if (t) addDay(t);
    }
  }

  const driverIds = new Set<string>();
  const vehicleIds = new Set<string>();
  for (const u of dossier.users) driverIds.add(u.id);
  for (const v of dossier.vehicles) vehicleIds.add(v.id);
  for (const e of dossier.safetyEvents) {
    driverIds.add(e.driver_id);
    vehicleIds.add(e.vehicle_id);
  }
  for (const l of dossier.vehicleLocations) {
    if (l.driver_id) driverIds.add(l.driver_id);
    vehicleIds.add(l.vehicle_id);
  }

  const locs = dossier.vehicleLocations;
  let night = 0;
  let weekend = 0;
  if (locs.length) {
    for (const l of locs) {
      const { hour, weekday } = localHourAndWeekday(l.occurred_at, tz);
      if (isNightHour(hour)) night += 1;
      if (isWeekend(weekday)) weekend += 1;
    }
  }

  return {
    totalMiles,
    totalEngineHours,
    totalDrivingDays: dayKeys.size,
    activeDriverCount: driverIds.size,
    activeVehicleCount: vehicleIds.size,
    nightDrivingPct: locs.length ? night / locs.length : null,
    weekendDrivingPct: locs.length ? weekend / locs.length : null,
    urbanDrivingPct: computeUrbanDrivingPctFromLocations(dossier),
  };
}

export function computeBehaviorRates(dossier: FleetDossier, exposure: ExposureMetrics): BehaviorRates {
  const miles = exposure.totalMiles;
  const per1k = (count: number) => (miles > 0 ? count / (miles / 1000) : 0);

  let braking = 0;
  let accel = 0;
  let corner = 0;
  let speeding = 0;
  for (const e of dossier.safetyEvents) {
    const c = mapRawSafetyEventToCanonical(e.event);
    if (c === CANONICAL_SAFETY_CATEGORY.HARD_BRAKING) braking += 1;
    else if (c === CANONICAL_SAFETY_CATEGORY.HARD_ACCELERATION) accel += 1;
    else if (c === CANONICAL_SAFETY_CATEGORY.CORNERING) corner += 1;
    else if (c === CANONICAL_SAFETY_CATEGORY.SPEEDING) speeding += 1;
  }

  const windowStart = new Date(dossier.window.start);
  const windowEnd = new Date(dossier.window.end);
  const months = approximateWindowMonths(windowStart, windowEnd);
  const denomDrivers = Math.max(1, exposure.activeDriverCount);
  const hosViolationsPerDriverMonth = dossier.hosViolations.length / (denomDrivers * months);

  const defects = dossier.dvirDefects;
  let critical = 0;
  for (const d of defects) {
    const s = d.severity;
    if (typeof s === "string" && /critical/i.test(s)) critical += 1;
  }
  const criticalDvirDefectRate = defects.length ? critical / defects.length : null;

  return {
    hardBrakingPer1k: per1k(braking),
    hardAccelPer1k: per1k(accel),
    corneringPer1k: per1k(corner),
    speedingPer1k: per1k(speeding),
    hosViolationsPerDriverMonth,
    criticalDvirDefectRate,
    /** No numeric severity field in dossier DVIR defects yet — reserved for future scoring */
    meanSeverityScore: null,
  };
}
