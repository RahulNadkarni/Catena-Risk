/**
 * Single-entry display-name overlay + curated claim narrative for the dispatch
 * demo driver.
 *
 * Why this exists: the Catena sandbox populates `driver_name` on
 * live-locations as `user_xxxxxxxx` for most drivers, and `driver_summaries`
 * returns synthetic `Driver_xxxxxx` values for the same drivers. That leaves
 * most of the dispatch board unnamed. To give a presentation one guaranteed
 * hero card, this file pins a human name to ONE real sandbox driver_id — and
 * provides a curated incident narrative for the claim that a dispatcher can
 * generate from that driver's "Simulate incident" card.
 *
 * Everything downstream of the overlay — HOS status, duty code, GPS,
 * violations, safety events, DVIR, weather (NOAA), road context (OSM),
 * speed timeline — is still the real live Catena / NOAA / OSM response for
 * this driver. Only the display label and the free-text incident description
 * are overridden.
 *
 * In production this file would not exist; the TSP would return real driver
 * names on live-locations and no overlay would be needed.
 */

/** TSP `driver_id` of the overlay driver. Used to detect the demo driver on
 *  both the dispatch board (for name resolution) and in the claims builder
 *  (for narrative overlay). */
export const DEMO_DRIVER_TSP_ID = "5abfdef7-fdcd-4964-a2d0-04f3238635fa";

export const DEMO_DRIVER_NAME_OVERRIDES: Record<string, string> = {
  [DEMO_DRIVER_TSP_ID]: "Dana Okafor",
};

/** Returns the demo display name for a TSP driver_id, or null. */
export function demoDriverNameFor(tspDriverId: string | null | undefined): string | null {
  if (!tspDriverId) return null;
  return DEMO_DRIVER_NAME_OVERRIDES[tspDriverId] ?? null;
}

/**
 * Curated incident context for the demo claim. Applied ONLY when the claim is
 * being generated for the overlay driver. Every other IncidentPacket field
 * (GPS, speed, HOS, DVIR, weather, road) is still pulled live.
 */
export const DEMO_INCIDENT_CONTEXT = {
  /** Replaces `incidentDescription` on the packet — a human-written narrative
   *  with impact direction, injuries, damage, and counsel-relevant facts that
   *  the sandbox API does not provide. */
  incidentDescription:
    "Rear-end collision at signalized intersection. Insured vehicle struck in the rear-quarter panel by a passenger sedan that failed to stop at the controlling signal. No injuries reported by the insured driver; the other motorist declined medical evaluation at the scene. Visible damage to the rear bumper and right-side tail assembly on the insured unit; the sedan sustained front-end and hood damage. Police were dispatched and a state-crash report was filed on-scene.",
  /** Short header the defense-packet PDF/view can use as the incident type. */
  incidentTypeLabel: "Rear-end collision · signalized intersection",
  /** Curated counsel-facing notes. These are opinion/strategy-adjacent, so
   *  flagged explicitly as demo/synthetic in the provenance. */
  counselNote:
    "Demo narrative: defensive posture favorable. Insured had right-of-way under signal phasing; other motorist's failure-to-stop is the proximate cause. Telematics (speed ≤ posted limit approaching the intersection, HOS compliant, no safety events in the 30-min pre-incident window) are consistent with the driver's account.",
} as const;
