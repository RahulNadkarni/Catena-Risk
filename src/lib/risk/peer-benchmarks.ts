import type { BehaviorRates } from "../domain/derived-metrics";
import { computeBehaviorRates, computeExposureMetrics } from "../domain/derived-metrics";
import type { FleetDossier } from "../domain/fleet-dossier";

/** Every numeric field we benchmark for peer comparison (z-score / percentile inputs). */
export type BehaviorMetricKey = keyof BehaviorRates;

export interface MetricStats {
  mean: number;
  median: number;
  stddev: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
  /** Number of fleets contributing a finite value for this metric */
  peerFleetCount: number;
  /** One value per peer fleet (same order as input dossiers where finite), sorted ascending */
  sortedValues: number[];
}

/**
 * Peer distributions for each telematics-derived rate in {@link BehaviorRates}, plus exposure
 * fields used for scoring (night share) carried separately in scoring.
 *
 * @remarks
 * **Demo limitation:** In this codebase, “peers” are typically the **hero fleet fixtures**
 * (all bundles under `src/lib/fixtures/fleets/`). That is a **convenience sample**, not a
 * statistically representative peer group. In production, segment peers by **fleet size,
 * commodity, geography, and operation type** before benchmarking; using a tiny, arbitrary peer
 * set can collapse variance and mis-state relative standing.
 */
export interface PeerBenchmarks {
  /** One entry per `BehaviorRates` key; nullable metrics treat `null` as **0** for benchmarking. */
  metrics: Record<BehaviorMetricKey, MetricStats>;
  /** Peer distribution of `ExposureMetrics.nightDrivingPct` (null → omitted from sample; if none, `[0]`). */
  nightDrivingPct: MetricStats;
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function medianSorted(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const m = Math.floor((sorted.length - 1) / 2);
  if (sorted.length % 2 === 1) return sorted[m]!;
  return (sorted[m]! + sorted[m + 1]!) / 2;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! * (hi - pos) + sorted[hi]! * (pos - lo);
}

function statsFromValues(values: number[]): MetricStats {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    mean: mean(sorted),
    median: medianSorted(sorted),
    stddev: stddev(sorted),
    p10: quantileSorted(sorted, 0.1),
    p25: quantileSorted(sorted, 0.25),
    p50: quantileSorted(sorted, 0.5),
    p75: quantileSorted(sorted, 0.75),
    p90: quantileSorted(sorted, 0.9),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    peerFleetCount: sorted.length,
    sortedValues: sorted,
  };
}

function coerceBehaviorRate(br: BehaviorRates, key: BehaviorMetricKey): number {
  const v = br[key];
  if (v == null) {
    if (key === "criticalDvirDefectRate" || key === "meanSeverityScore") return 0;
    return 0;
  }
  return v;
}

function pickRates(dossiers: FleetDossier[], key: BehaviorMetricKey): number[] {
  const out: number[] = [];
  for (const d of dossiers) {
    const exposure = computeExposureMetrics(d);
    const br = computeBehaviorRates(d, exposure);
    out.push(coerceBehaviorRate(br, key));
  }
  return out;
}

function pickNightShares(dossiers: FleetDossier[]): number[] {
  const out: number[] = [];
  for (const d of dossiers) {
    const exposure = computeExposureMetrics(d);
    const n = exposure.nightDrivingPct;
    if (n == null) continue;
    if (Number.isFinite(n)) out.push(n);
  }
  return out.length ? out : [0];
}

/**
 * Builds per-metric peer statistics across the given fleet dossiers.
 * Each dossier contributes one point per metric (after computing exposure + behavior rates).
 */
export function computePeerBenchmarks(dossiers: FleetDossier[]): PeerBenchmarks {
  const keys: BehaviorMetricKey[] = [
    "hardBrakingPer1k",
    "hardAccelPer1k",
    "corneringPer1k",
    "speedingPer1k",
    "hosViolationsPerDriverMonth",
    "criticalDvirDefectRate",
    "meanSeverityScore",
  ];
  const metrics = {} as Record<BehaviorMetricKey, MetricStats>;
  for (const k of keys) {
    const vals = pickRates(dossiers, k);
    metrics[k] = statsFromValues(vals.length ? vals : [0]);
  }
  const nightVals = pickNightShares(dossiers);
  return {
    metrics,
    nightDrivingPct: statsFromValues(nightVals.length ? nightVals : [0]),
  };
}

/**
 * Empirical percentile (0–100) where **higher values** of `value` map to **higher** percentiles
 * (“worse” for rates like per-1k events). Uses the peer **value list** (one value per fleet,
 * including the fleet under review).
 */
export function percentileRankHigherWorse(value: number, peerValues: number[]): number {
  if (peerValues.length === 0) return 50;
  const sorted = [...peerValues].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 1) return 50;

  const eps = 1e-9;
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (Math.abs(sorted[i]! - value) <= eps) indices.push(i);
  }
  if (indices.length === 0) {
    let lo = 0;
    while (lo < n && sorted[lo]! < value) lo++;
    const pos = lo;
    return Math.max(0, Math.min(100, (pos / (n - 1)) * 100));
  }
  const avgIx = indices.reduce((a, b) => a + b, 0) / indices.length;
  return Math.max(0, Math.min(100, (avgIx / (n - 1)) * 100));
}
