/**
 * Maps provider-specific `event` strings on driver safety rows to a small canonical set
 * used for insurance-style behavior rates (Geotab-style names observed in exploration).
 */

export const CANONICAL_SAFETY_CATEGORY = {
  HARD_BRAKING: "hard_braking",
  HARD_ACCELERATION: "hard_acceleration",
  CORNERING: "cornering",
  SPEEDING: "speeding",
  UNKNOWN: "unknown",
} as const;

export type CanonicalSafetyCategory =
  (typeof CANONICAL_SAFETY_CATEGORY)[keyof typeof CANONICAL_SAFETY_CATEGORY];

/** Raw `event` string (lowercased before lookup) → canonical bucket */
export const RAW_EVENT_TO_CANONICAL: Record<string, CanonicalSafetyCategory> = {
  // Braking
  hard_braking: CANONICAL_SAFETY_CATEGORY.HARD_BRAKING,
  hard_brake: CANONICAL_SAFETY_CATEGORY.HARD_BRAKING,
  braking: CANONICAL_SAFETY_CATEGORY.HARD_BRAKING,
  // Accel
  hard_acceleration: CANONICAL_SAFETY_CATEGORY.HARD_ACCELERATION,
  hard_accel: CANONICAL_SAFETY_CATEGORY.HARD_ACCELERATION,
  acceleration: CANONICAL_SAFETY_CATEGORY.HARD_ACCELERATION,
  // Cornering (incl. harsh turn)
  harsh_turn: CANONICAL_SAFETY_CATEGORY.CORNERING,
  cornering: CANONICAL_SAFETY_CATEGORY.CORNERING,
  hard_cornering: CANONICAL_SAFETY_CATEGORY.CORNERING,
  // Speeding
  speeding: CANONICAL_SAFETY_CATEGORY.SPEEDING,
  // Not mapped to primary buckets
  tailgating: CANONICAL_SAFETY_CATEGORY.UNKNOWN,
};

export function mapRawSafetyEventToCanonical(rawEvent: string): CanonicalSafetyCategory {
  const key = rawEvent.trim().toLowerCase();
  return RAW_EVENT_TO_CANONICAL[key] ?? CANONICAL_SAFETY_CATEGORY.UNKNOWN;
}
