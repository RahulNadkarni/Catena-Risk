import { describe, expect, it } from "vitest";
import { computeBehaviorRates, computeExposureMetrics, estimateMilesFromOdometerDeltas } from "@/lib/domain/derived-metrics";
import type { FleetDossier } from "@/lib/domain/fleet-dossier";
import { CANONICAL_SAFETY_CATEGORY, RAW_EVENT_TO_CANONICAL, mapRawSafetyEventToCanonical } from "@/lib/domain/safety-event-taxonomy";

const emptyDossier = (windowIso: { start: string; end: string }): FleetDossier => ({
  fleetId: "00000000-0000-0000-0000-000000000001",
  window: windowIso,
  source: "api",
  meta: {
    fetchedAt: windowIso.end,
    source: "api",
    totalApiCalls: 0,
    totalLatencyMs: 0,
    endpointTimings: {},
    windowDays: 90,
    fetchStatus: {},
  },
  fleet: null,
  vehicles: [],
  users: [],
  safetyEvents: [],
  vehicleLocations: [],
  hosEvents: [],
  hosViolations: [],
  hosDailySnapshots: [],
  hosAvailabilities: [],
  dvirLogs: [],
  dvirDefects: [],
  engineLogs: [],
  connections: [],
  analyticsOverview: null,
  regionSegments: [],
  fuelTransactions: [],
  dataFreshness: { fleetId: "00000000-0000-0000-0000-000000000001", rows: [] },
  driverVehicleAssociations: [],
  dataGaps: [],
});

describe("safety-event taxonomy", () => {
  it("maps known raw event strings", () => {
    expect(mapRawSafetyEventToCanonical("hard_braking")).toBe(CANONICAL_SAFETY_CATEGORY.HARD_BRAKING);
    expect(mapRawSafetyEventToCanonical("harsh_turn")).toBe(CANONICAL_SAFETY_CATEGORY.CORNERING);
    expect(mapRawSafetyEventToCanonical("speeding")).toBe(CANONICAL_SAFETY_CATEGORY.SPEEDING);
    expect(RAW_EVENT_TO_CANONICAL.hard_braking).toBe(CANONICAL_SAFETY_CATEGORY.HARD_BRAKING);
  });

  it("is case-insensitive for unknown preservation", () => {
    expect(mapRawSafetyEventToCanonical("HARD_BRAKING")).toBe(CANONICAL_SAFETY_CATEGORY.HARD_BRAKING);
    expect(mapRawSafetyEventToCanonical("not_a_real_event")).toBe(CANONICAL_SAFETY_CATEGORY.UNKNOWN);
  });
});

describe("estimateMilesFromOdometerDeltas", () => {
  const F = "00000000-0000-0000-0000-0000000000f1";
  it("returns 0 when no rows", () => {
    expect(estimateMilesFromOdometerDeltas([])).toBe(0);
  });

  it("sums plausible deltas per vehicle", () => {
    const miles = estimateMilesFromOdometerDeltas([
      {
        id: "a",
        fleet_id: F,
        vehicle_id: "v1",
        occurred_at: "2026-01-01T10:00:00.000Z",
        odometer: 100,
      } as never,
      {
        id: "b",
        fleet_id: F,
        vehicle_id: "v1",
        occurred_at: "2026-01-01T11:00:00.000Z",
        odometer: 150,
      } as never,
    ]);
    expect(miles).toBe(50);
  });
});

describe("computeExposureMetrics / computeBehaviorRates", () => {
  it("zero exposure: no miles yields zero per-1k rates and null night/weekend when no locations", () => {
    const w = { start: "2026-01-01T00:00:00.000Z", end: "2026-04-01T00:00:00.000Z" };
    const d = emptyDossier(w);
    const ex = computeExposureMetrics(d);
    expect(ex.totalMiles).toBe(0);
    expect(ex.nightDrivingPct).toBeNull();
    expect(ex.weekendDrivingPct).toBeNull();

    const br = computeBehaviorRates(d, ex);
    expect(br.hardBrakingPer1k).toBe(0);
    expect(br.speedingPer1k).toBe(0);
    expect(br.hosViolationsPerDriverMonth).toBe(0);
  });

  it("known per-1k math for safety counts", () => {
    const w = { start: "2026-01-01T00:00:00.000Z", end: "2026-04-01T00:00:00.000Z" };
    const d = emptyDossier(w);
    d.safetyEvents = [
      {
        id: "s1",
        fleet_id: d.fleetId,
        driver_id: "d1",
        vehicle_id: "v1",
        event: "hard_braking",
      } as never,
      {
        id: "s2",
        fleet_id: d.fleetId,
        driver_id: "d1",
        vehicle_id: "v1",
        event: "hard_braking",
      } as never,
    ];
    d.vehicleLocations = [
      {
        id: "l1",
        fleet_id: d.fleetId,
        vehicle_id: "v1",
        occurred_at: "2026-01-15T12:00:00.000Z",
        odometer: 0,
      } as never,
      {
        id: "l2",
        fleet_id: d.fleetId,
        vehicle_id: "v1",
        occurred_at: "2026-01-15T13:00:00.000Z",
        odometer: 100,
      } as never,
    ];
    const ex = computeExposureMetrics(d);
    expect(ex.totalMiles).toBe(100);
    const br = computeBehaviorRates(d, ex);
    expect(br.hardBrakingPer1k).toBeCloseTo(20, 5); // 2 events / (100/1000) = 20
  });

  it("night driving % uses America/New_York for fixed timestamps", () => {
    const w = { start: "2026-01-01T00:00:00.000Z", end: "2026-04-01T00:00:00.000Z" };
    const d = emptyDossier(w);
    d.hosEvents = [
      {
        id: "h1",
        fleet_id: d.fleetId,
        driver_id: "d1",
        time_zone_code: "America/New_York",
      } as never,
    ];
    // 03:00 local is still "night" (22–05) when UTC is morning? Pick a time that is 23:30 local:
    // 2026-06-01T03:30:00.000Z is 23:30 previous day in NY (EDT, UTC-4)? June 1 03:30 UTC = May 31 23:30 EDT — night.
    d.vehicleLocations = [
      {
        id: "l1",
        fleet_id: d.fleetId,
        vehicle_id: "v1",
        occurred_at: "2026-06-01T03:30:00.000Z",
        odometer: 0,
      } as never,
      {
        id: "l2",
        fleet_id: d.fleetId,
        vehicle_id: "v1",
        occurred_at: "2026-06-01T15:00:00.000Z",
        odometer: 10,
      } as never,
    ];
    const ex = computeExposureMetrics(d);
    expect(ex.nightDrivingPct).toBe(0.5);
  });
});
