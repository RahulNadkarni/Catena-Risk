/**
 * Default sub-score weights for `computeRiskScore`.
 *
 * Weights sum to **1.0** and are applied to peer-normalized sub-scores (0–100, higher = better).
 *
 * **Actuarial / safety literature (commercial auto & fleet telematics)**
 *
 * - **Speeding (0.25):** Excess speed is consistently associated with higher crash frequency and
 *   severity in commercial vehicle studies; telematics programs often treat speeding as a primary
 *   behavioral loss driver (FMCSA SMS / BASIC concepts; NHTSA speed–crash risk relationships).
 *
 * - **Hard braking (0.20):** Hard braking frequency is widely used as a proxy for tailgating,
 *   attention failures, and near-miss events; elevated rates correlate with rear-end and
 *   intersection-type claims in fleet telematics literature.
 *
 * - **Harsh cornering (0.10):** Secondary kinematic indicator (stability / rollover / loss-of-control
 *   exposure), typically secondary to speed and braking in severity ordering.
 *
 * - **Night exposure (0.10):** Nighttime driving elevates crash risk versus daytime in many
 *   actuarial studies (visibility, fatigue interaction); we use night driving share as an
 *   exposure-normalized factor rather than raw miles.
 *
 * - **HOS compliance (0.20):** Hours-of-service violations proxy fatigue-related operational risk;
 *   fatigue is disproportionately represented in severity-weighted truck crash outcomes in
 *   regulatory and insurer analyses (FMCSA HOS framework).
 *
 * - **Vehicle maintenance (0.15):** DVIR-critical defects surface mechanical / inspection issues
 *   correlated with equipment-related incidents; treated as a maintenance program signal.
 *
 * These citations are **directional** for underwriting transparency; production models should be
 * calibrated on carrier experience and filed rating plans.
 *
 * **HARDCODED FOR DEMO.** No Catena API exposes carrier-specific rating weights — in production
 * these would come from an internal rating service (e.g. a versioned `risk-config` table keyed by
 * program / filing effective date, backed by an internal API like `GET /rating/programs/{id}/weights`)
 * so changes can be audited against filed rating plans without redeploying code.
 */
export const RISK_SCORE_WEIGHTS = {
  speeding: 0.25,
  hardBraking: 0.2,
  harshCornering: 0.1,
  nightExposure: 0.1,
  hosCompliance: 0.2,
  vehicleMaintenance: 0.15,
} as const;

export type RiskScoreWeightKey = keyof typeof RISK_SCORE_WEIGHTS;

export function assertWeightsSumToOne(): void {
  const s =
    RISK_SCORE_WEIGHTS.speeding +
    RISK_SCORE_WEIGHTS.hardBraking +
    RISK_SCORE_WEIGHTS.harshCornering +
    RISK_SCORE_WEIGHTS.nightExposure +
    RISK_SCORE_WEIGHTS.hosCompliance +
    RISK_SCORE_WEIGHTS.vehicleMaintenance;
  if (Math.abs(s - 1) > 1e-6) {
    throw new Error(`RISK_SCORE_WEIGHTS must sum to 1, got ${s}`);
  }
}
