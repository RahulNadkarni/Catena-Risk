/**
 * Fleet risk scoring (Phase 2)
 *
 * Design principles:
 *
 * 1. **Transparent** — Weights live in `weights.ts`; sub-scores expose raw values, peer
 *    percentiles, and weighted contributions for inspection.
 * 2. **Defensible** — Weights cite directional commercial-auto / telematics literature in
 *    `weights.ts` (not filed rating-plan precision).
 * 3. **Exposure-normalized** — Behavioral inputs are rates (per 1k mi, share of pings, etc.),
 *    not raw event counts.
 * 4. **Peer-relative** — Standing is versus the peer empirical distribution from
 *    `PeerBenchmarks`, not fixed absolute cutoffs.
 * 5. **Decomposable** — `compositeScore` equals the sum of `contributionToFinalScore` across
 *    sub-scores (weights sum to 1).
 */

import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import type { BehaviorRates, ExposureMetrics } from "../domain/derived-metrics";
import type { FleetDossier } from "../domain/fleet-dossier";
import { percentileRankHigherWorse, type PeerBenchmarks } from "./peer-benchmarks";
import { assertWeightsSumToOne, RISK_SCORE_WEIGHTS } from "./weights";

let validatedWeights = false;
function ensureWeightsOnce() {
  if (!validatedWeights) {
    assertWeightsSumToOne();
    validatedWeights = true;
  }
}

export interface RiskScoreInputs {
  behaviorRates: BehaviorRates;
  exposure: ExposureMetrics;
  peerBenchmarks: PeerBenchmarks;
  /**
   * When set, used for **confidence**, **`dataWindowDays`**, and data-recency signals.
   * If omitted, confidence defaults to **medium** and window length to **90** days.
   */
  dossier?: FleetDossier;
}

export interface SubScore {
  category:
    | "speeding"
    | "hardBraking"
    | "harshCornering"
    | "nightExposure"
    | "hosCompliance"
    | "vehicleMaintenance";
  rawValue: number;
  /** 0–100; higher = worse vs peers (empirical rank among peer values). */
  peerPercentile: number;
  /** 0–100; higher = better risk profile on this dimension. */
  subScore: number;
  weight: number;
  contributionToFinalScore: number;
  narrative: string;
}

export interface RiskScore {
  compositeScore: number;
  tier: "Preferred" | "Standard" | "Substandard" | "Decline";
  subScores: SubScore[];
  topRiskDrivers: SubScore[];
  topStrengths: SubScore[];
  recommendedAction: {
    decision: "quote_standard" | "quote_with_surcharge" | "refer" | "decline";
    surchargePct?: number;
    conditions?: string[];
    rationale: string;
  };
  confidence: "high" | "medium" | "low";
  computedAt: Date;
  dataWindowDays: number;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function fmt(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(digits);
}

function maxDataFreshnessHours(dossier: FleetDossier | undefined): number | null {
  if (!dossier?.dataFreshness?.rows?.length) return null;
  const now = Date.now();
  let maxH = 0;
  for (const r of dossier.dataFreshness.rows) {
    const t = Date.parse(r.updatedAt);
    if (!Number.isFinite(t)) continue;
    maxH = Math.max(maxH, (now - t) / 3600000);
  }
  return maxH;
}

function computeConfidence(
  dossier: FleetDossier | undefined,
  exposure: ExposureMetrics,
): "high" | "medium" | "low" {
  const days =
    dossier != null
      ? differenceInCalendarDays(new Date(dossier.window.end), new Date(dossier.window.start)) + 1
      : 90;
  const drivers = exposure.activeDriverCount;
  const miles = exposure.totalMiles;
  const fh = maxDataFreshnessHours(dossier);
  const high = days >= 60 && drivers >= 10 && miles >= 1000 && fh != null && fh < 24;
  const low = days < 30 || drivers < 3 || (fh != null && fh >= 24);
  if (high) return "high";
  if (low) return "low";
  return "medium";
}

function tierFromScore(composite: number): RiskScore["tier"] {
  if (composite >= 80) return "Preferred";
  if (composite >= 65) return "Standard";
  if (composite >= 50) return "Substandard";
  return "Decline";
}

function recommendedFromTier(score: RiskScore): RiskScore["recommendedAction"] {
  const c = score.compositeScore;
  const worst = score.topRiskDrivers.map((s) => s.category).join(", ");
  if (c >= 80) {
    return {
      decision: "quote_standard",
      rationale:
        "Composite score sits in the Preferred band. Telematics behavior and exposure signals are at or better than peer norms on weighted dimensions; standard terms are appropriate absent other underwriting concerns.",
    };
  }
  if (c >= 65) {
    const pct = clamp(5 + ((79 - c) / 14) * 10, 5, 15);
    return {
      decision: "quote_with_surcharge",
      surchargePct: Math.round(pct * 10) / 10,
      conditions: worst
        ? [`Monitor ${worst.split(", ").slice(0, 2).join(" and ")} in renewal telemetry reviews`]
        : undefined,
      rationale:
        "Composite score falls in the Standard band versus peers. Pricing includes a modest surcharge reflecting elevated-but-manageable relative risk; continue to validate trend direction on renewal telematics pulls.",
    };
  }
  if (c >= 50) {
    return {
      decision: "refer",
      surchargePct: 22,
      conditions: [
        "Refer to senior underwriter for telematics review",
        "Attach corrective-action plan if HOS or maintenance sub-scores are primary drivers",
      ],
      rationale:
        "Composite score is Substandard relative to peers. Severity is sufficient to require senior sign-off; apply a material surcharge band and operational conditions before binding.",
    };
  }
  return {
    decision: "decline",
    rationale:
      "Composite score is below minimum appetite versus the peer reference set. Decline or non-renew unless risk can be re-segmented (e.g., geography, commodity, or verified remediation) with stronger controls.",
  };
}

function buildSubScore(
  category: SubScore["category"],
  rawValue: number,
  peerSortedValues: number[],
  weight: number,
  narrative: string,
): SubScore {
  const peerPercentile = percentileRankHigherWorse(rawValue, peerSortedValues);
  const subScore = clamp(100 - peerPercentile, 0, 100);
  return {
    category,
    rawValue,
    peerPercentile,
    subScore,
    weight,
    contributionToFinalScore: subScore * weight,
    narrative,
  };
}

/**
 * Computes a peer-relative, weighted composite risk score and underwriting recommendation.
 */
export function computeRiskScore(inputs: RiskScoreInputs): RiskScore {
  ensureWeightsOnce();
  const { behaviorRates: br, exposure, peerBenchmarks: pb, dossier } = inputs;
  const m = pb.metrics;

  const urbanNote =
    exposure.urbanDrivingPct != null
      ? `Urban/heuristic address share ~${fmt(exposure.urbanDrivingPct * 100, 0)}% of pings.`
      : "Urban concentration could not be inferred from address fields.";

  const speedingN = buildSubScore(
    "speeding",
    br.speedingPer1k,
    m.speedingPer1k.sortedValues,
    RISK_SCORE_WEIGHTS.speeding,
    `Speeding-related events occur at ${fmt(br.speedingPer1k)} per 1k mi vs peer median ${fmt(m.speedingPer1k.median)}. ${urbanNote} Elevated speeding frequency is a primary severity driver in commercial auto loss studies.`,
  );

  const brakingN = buildSubScore(
    "hardBraking",
    br.hardBrakingPer1k,
    m.hardBrakingPer1k.sortedValues,
    RISK_SCORE_WEIGHTS.hardBraking,
    `Hard braking occurs at ${fmt(br.hardBrakingPer1k)} per 1k mi vs peer median ${fmt(m.hardBrakingPer1k.median)}. ${urbanNote} Hard braking is a frequency proxy for following-distance discipline and rear-end exposure.`,
  );

  const cornerN = buildSubScore(
    "harshCornering",
    br.corneringPer1k,
    m.corneringPer1k.sortedValues,
    RISK_SCORE_WEIGHTS.harshCornering,
    `Harsh cornering events occur at ${fmt(br.corneringPer1k)} per 1k mi vs peer median ${fmt(m.corneringPer1k.median)}. This is a secondary kinematic indicator versus speed and braking.`,
  );

  const nightW = RISK_SCORE_WEIGHTS.nightExposure;
  const nightN: SubScore =
    exposure.nightDrivingPct == null
      ? {
          category: "nightExposure",
          rawValue: 0,
          peerPercentile: 50,
          subScore: 50,
          weight: nightW,
          contributionToFinalScore: 50 * nightW,
          narrative:
            "Night driving share could not be computed (insufficient location/time-zone coverage); peer-relative standing defaults to neutral on this axis.",
        }
      : buildSubScore(
          "nightExposure",
          exposure.nightDrivingPct,
          pb.nightDrivingPct.sortedValues,
          nightW,
          `Approximately ${fmt(exposure.nightDrivingPct * 100, 0)}% of telematics pings fall in the 22:00–05:00 local window vs peer median ${fmt(pb.nightDrivingPct.median * 100, 0)}%. Night driving elevates exposure versus daytime in actuarial studies.`,
        );

  const hosN = buildSubScore(
    "hosCompliance",
    br.hosViolationsPerDriverMonth,
    m.hosViolationsPerDriverMonth.sortedValues,
    RISK_SCORE_WEIGHTS.hosCompliance,
    `HOS violations register at ${fmt(br.hosViolationsPerDriverMonth)} per driver-month vs peer median ${fmt(m.hosViolationsPerDriverMonth.median)}. Fatigue-related crash outcomes are disproportionately severe in regulatory analyses.`,
  );

  const maintRaw = br.criticalDvirDefectRate ?? 0;
  const maintN = buildSubScore(
    "vehicleMaintenance",
    maintRaw,
    m.criticalDvirDefectRate.sortedValues,
    RISK_SCORE_WEIGHTS.vehicleMaintenance,
    br.criticalDvirDefectRate == null
      ? "Critical DVIR defect rate could not be observed (no defect severities); treated as zero for maintenance signal."
      : `Critical DVIR defects represent ${fmt(maintRaw * 100, 1)}% of defect records vs peer median ${fmt(m.criticalDvirDefectRate.median * 100, 1)}%.`,
  );

  const subScores = [speedingN, brakingN, cornerN, nightN, hosN, maintN];
  const compositeScore = clamp(
    subScores.reduce((s, x) => s + x.contributionToFinalScore, 0),
    0,
    100,
  );

  const sortedWorst = [...subScores].sort((a, b) => a.subScore - b.subScore);
  const sortedBest = [...subScores].sort((a, b) => b.subScore - a.subScore);

  const tier = tierFromScore(compositeScore);
  const computedAt = new Date();
  const dataWindowDays =
    dossier != null
      ? differenceInCalendarDays(new Date(dossier.window.end), new Date(dossier.window.start)) + 1
      : 90;

  const base: RiskScore = {
    compositeScore,
    tier,
    subScores,
    topRiskDrivers: sortedWorst.slice(0, 3),
    topStrengths: sortedBest.slice(0, 2),
    recommendedAction: { decision: "quote_standard", rationale: "" },
    confidence: computeConfidence(dossier, exposure),
    computedAt,
    dataWindowDays,
  };
  base.recommendedAction = recommendedFromTier(base);
  return base;
}
