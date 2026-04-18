import { describe, expect, it } from "vitest";
import type { BehaviorRates, ExposureMetrics } from "@/lib/domain/derived-metrics";
import type { FleetDossier } from "@/lib/domain/fleet-dossier";
import type { MetricStats, PeerBenchmarks } from "@/lib/risk/peer-benchmarks";
import { percentileRankHigherWorse } from "@/lib/risk/peer-benchmarks";
import { computeRiskScore, type RiskScoreInputs } from "@/lib/risk/scoring";
import { RISK_SCORE_WEIGHTS } from "@/lib/risk/weights";

function metricStats(sortedValues: number[]): MetricStats {
  const s = [...sortedValues].sort((a, b) => a - b);
  return {
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    median: s[Math.floor(s.length / 2)]!,
    stddev: 0,
    p10: s[0]!,
    p25: s[0]!,
    p50: s[Math.floor(s.length / 2)]!,
    p75: s[s.length - 1]!,
    p90: s[s.length - 1]!,
    min: s[0]!,
    max: s[s.length - 1]!,
    peerFleetCount: s.length,
    sortedValues: s,
  };
}

/** Three-fleet peer ladder: low / mid / high values on each axis */
function peerLadder(lowMidHigh: [number, number, number]): PeerBenchmarks {
  const t = metricStats(lowMidHigh);
  return {
    metrics: {
      hardBrakingPer1k: t,
      hardAccelPer1k: t,
      corneringPer1k: t,
      speedingPer1k: t,
      hosViolationsPerDriverMonth: t,
      criticalDvirDefectRate: t,
      meanSeverityScore: t,
    },
    nightDrivingPct: metricStats([0.05, 0.1, 0.15]),
  };
}

function baseBehavior(over: Partial<BehaviorRates> = {}): BehaviorRates {
  return {
    hardBrakingPer1k: 1,
    hardAccelPer1k: 1,
    corneringPer1k: 1,
    speedingPer1k: 1,
    hosViolationsPerDriverMonth: 1,
    criticalDvirDefectRate: 0,
    meanSeverityScore: null,
    ...over,
  };
}

function baseExposure(over: Partial<ExposureMetrics> = {}): ExposureMetrics {
  return {
    totalMiles: 5000,
    totalEngineHours: 100,
    totalDrivingDays: 60,
    activeDriverCount: 12,
    activeVehicleCount: 10,
    nightDrivingPct: 0.05,
    weekendDrivingPct: 0.2,
    urbanDrivingPct: 0.1,
    ...over,
  };
}

function dossierForConfidence(opts: {
  days: number;
  drivers: number;
  miles: number;
  freshHours?: number | null;
}): FleetDossier {
  const start = new Date("2026-01-01T00:00:00Z");
  const end = new Date(start);
  end.setDate(end.getDate() + opts.days - 1);
  const now = Date.now();
  const updatedAt =
    opts.freshHours == null
      ? new Date(now).toISOString()
      : new Date(now - opts.freshHours * 3600000).toISOString();
  return {
    fleetId: "00000000-0000-0000-0000-000000000001",
    window: { start: start.toISOString(), end: end.toISOString() },
    source: "fixtures",
    meta: {
      fetchedAt: new Date().toISOString(),
      source: "fixtures",
      totalApiCalls: 0,
      totalLatencyMs: 0,
      endpointTimings: {},
      windowDays: opts.days,
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
    dataFreshness: {
      fleetId: "00000000-0000-0000-0000-000000000001",
      rows: [
        {
          connectionId: "c1",
          sourceName: "tsp",
          status: "active",
          updatedAt,
        },
      ],
    },
    driverVehicleAssociations: [],
    dataGaps: [],
  } as FleetDossier;
}

describe("percentileRankHigherWorse", () => {
  it("ranks lowest value at 0th percentile", () => {
    expect(percentileRankHigherWorse(1, [1, 2, 3])).toBe(0);
  });
  it("ranks highest value at 100th percentile", () => {
    expect(percentileRankHigherWorse(3, [1, 2, 3])).toBe(100);
  });
});

describe("computeRiskScore", () => {
  it("composite equals sum of weighted contributions", () => {
    const pb = peerLadder([1, 2, 3]);
    const inputs: RiskScoreInputs = {
      behaviorRates: baseBehavior({ speedingPer1k: 2, hardBrakingPer1k: 2 }),
      exposure: baseExposure({ nightDrivingPct: 0.1 }),
      peerBenchmarks: pb,
    };
    const score = computeRiskScore(inputs);
    const sum = score.subScores.reduce((a, s) => a + s.contributionToFinalScore, 0);
    expect(sum).toBeCloseTo(score.compositeScore, 5);
    const wsum = score.subScores.reduce((a, s) => a + s.weight, 0);
    expect(wsum).toBeCloseTo(1, 5);
  });

  it("tier Preferred when all dimensions best vs peer ladder", () => {
    const pb = peerLadder([1, 2, 3]);
    const score = computeRiskScore({
      behaviorRates: baseBehavior({
        speedingPer1k: 1,
        hardBrakingPer1k: 1,
        corneringPer1k: 1,
        hosViolationsPerDriverMonth: 1,
        criticalDvirDefectRate: 0,
      }),
      exposure: baseExposure({ nightDrivingPct: 0.05 }),
      peerBenchmarks: pb,
    });
    expect(score.compositeScore).toBeGreaterThanOrEqual(80);
    expect(score.tier).toBe("Preferred");
    expect(score.recommendedAction.decision).toBe("quote_standard");
  });

  it("tier Decline when all dimensions worst vs peer ladder", () => {
    const pb = peerLadder([1, 2, 3]);
    const score = computeRiskScore({
      behaviorRates: baseBehavior({
        speedingPer1k: 3,
        hardBrakingPer1k: 3,
        corneringPer1k: 3,
        hosViolationsPerDriverMonth: 3,
        criticalDvirDefectRate: 3,
      }),
      exposure: baseExposure({ nightDrivingPct: 0.15 }),
      peerBenchmarks: pb,
    });
    expect(score.compositeScore).toBeLessThan(50);
    expect(score.tier).toBe("Decline");
    expect(score.recommendedAction.decision).toBe("decline");
  });

  it("higher speeding rate lowers composite vs peers (monotonic sensitivity)", () => {
    const pb = peerLadder([1, 2, 3]);
    const low = computeRiskScore({
      behaviorRates: baseBehavior({ speedingPer1k: 1 }),
      exposure: baseExposure(),
      peerBenchmarks: pb,
    });
    const high = computeRiskScore({
      behaviorRates: baseBehavior({ speedingPer1k: 3 }),
      exposure: baseExposure(),
      peerBenchmarks: pb,
    });
    expect(high.compositeScore).toBeLessThan(low.compositeScore);
  });

  it("missing night share uses neutral 50 on night dimension", () => {
    const pb = peerLadder([1, 2, 3]);
    const score = computeRiskScore({
      behaviorRates: baseBehavior(),
      exposure: baseExposure({ nightDrivingPct: null }),
      peerBenchmarks: pb,
    });
    const night = score.subScores.find((s) => s.category === "nightExposure")!;
    expect(night.subScore).toBe(50);
    expect(night.contributionToFinalScore).toBeCloseTo(50 * RISK_SCORE_WEIGHTS.nightExposure, 5);
  });

  it("zero exposure-normalized rates (0 per 1k) rank best vs peers when peer ladder is positive", () => {
    const pb = peerLadder([1, 2, 3]);
    const score = computeRiskScore({
      behaviorRates: baseBehavior({
        speedingPer1k: 0,
        hardBrakingPer1k: 0,
        corneringPer1k: 0,
        hosViolationsPerDriverMonth: 0,
        criticalDvirDefectRate: 0,
      }),
      exposure: baseExposure({ nightDrivingPct: 0.05 }),
      peerBenchmarks: pb,
    });
    expect(score.compositeScore).toBeGreaterThan(90);
  });

  it("confidence high vs low based on volume and freshness", () => {
    const pb = peerLadder([1, 2, 3]);
    const high = computeRiskScore({
      behaviorRates: baseBehavior(),
      exposure: baseExposure({ activeDriverCount: 12, totalMiles: 2000 }),
      peerBenchmarks: pb,
      dossier: dossierForConfidence({ days: 70, drivers: 12, miles: 2000, freshHours: 1 }),
    });
    expect(high.confidence).toBe("high");

    const low = computeRiskScore({
      behaviorRates: baseBehavior(),
      exposure: baseExposure({ activeDriverCount: 2, totalMiles: 100 }),
      peerBenchmarks: pb,
      dossier: dossierForConfidence({ days: 20, drivers: 2, miles: 100, freshHours: 1 }),
    });
    expect(low.confidence).toBe("low");
  });
});
