/**
 * Operational notes for Catena sandbox behavior (product guidance, not API schema).
 */
export const SANDBOX_WEBHOOKS_DO_NOT_FIRE: string =
  "Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos.";
