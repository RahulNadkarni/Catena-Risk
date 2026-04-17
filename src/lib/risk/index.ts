export { computePeerBenchmarks, percentileRankHigherWorse } from "./peer-benchmarks";
export type { BehaviorMetricKey, MetricStats, PeerBenchmarks } from "./peer-benchmarks";

export { computeRiskScore } from "./scoring";
export type { RiskScore, RiskScoreInputs, SubScore } from "./scoring";

export { buildUnderwriterNarrative } from "./explanations";

export { RISK_SCORE_WEIGHTS, assertWeightsSumToOne } from "./weights";
export type { RiskScoreWeightKey } from "./weights";
