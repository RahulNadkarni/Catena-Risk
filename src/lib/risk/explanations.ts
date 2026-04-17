import type { RiskScore } from "./scoring";

/**
 * Produces a multi-paragraph underwriter narrative suitable for a rate justification memo.
 * Tone: clinical, specific, non-marketing.
 */
export function buildUnderwriterNarrative(score: RiskScore): string {
  const { tier, compositeScore, confidence, topRiskDrivers, topStrengths, recommendedAction, dataWindowDays } =
    score;

  const p1 = `The fleet maps to the **${tier}** tier with a composite telematics score of **${compositeScore.toFixed(1)}** on a 0–100 scale (higher is more favorable). This assessment is **peer-relative** against the current benchmark cohort, uses exposure-normalized rates, and should be read alongside non-telematics underwriting factors. Model **confidence** is **${confidence}** given roughly **${dataWindowDays}** days of windowed data and connection-recency signals.`;

  const drivers = topRiskDrivers
    .filter((s) => s.subScore < 70)
    .slice(0, 3);
  const p2 =
    drivers.length > 0
      ? `Primary elevated signals versus peers include: ${drivers
          .map((s) => `${s.category} (sub-score ${s.subScore.toFixed(0)}, peer percentile ${s.peerPercentile.toFixed(0)} on raw ${s.rawValue.toFixed(3)})`)
          .join("; ")}. These dimensions drive relative frequency/severity exposure in commercial auto telematics programs and warrant explicit mention in the file.`
      : `No sub-score falls below the 70 peer-normalized threshold in this snapshot; relative weaknesses are muted versus the benchmark cohort.`;

  const strengths = topStrengths.filter((s) => s.subScore >= 75).slice(0, 2);
  const p3 =
    strengths.length > 0
      ? `Offsetting strengths versus peers: ${strengths
          .map((s) => `${s.category} (sub-score ${s.subScore.toFixed(0)})`)
          .join("; ")}.`
      : `No strong offsetting strengths were identified versus peers at this percentile cut; the composite is not being carried by a single favorable dimension.`;

  const act = recommendedAction;
  const cond = act.conditions?.length ? ` Conditions: ${act.conditions.join("; ")}.` : "";
  const sur = act.surchargePct != null ? ` Indicated surcharge band: **${act.surchargePct}%**.` : "";

  const p4 = `Recommended pricing posture: **${act.decision}**.${sur}${cond} Rationale: ${act.rationale}`;

  return [p1, p2, p3, p4].join("\n\n");
}
