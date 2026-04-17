/**
 * Barrel for Catena OpenAPI-ish types (Zod-inferred) plus shared request param types.
 */
import type { ConnectionRead } from "./schemas/integrations";

export * from "./schemas";

/** Alias for integration rows (`ConnectionRead`) */
export type Integration = ConnectionRead;

/** Loose JSON type for exploration before schemas are finalized */
export type CatenaJson = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type CatenaUnknown = unknown;

export interface DateRangeIso {
  from: string;
  to: string;
}

export interface PaginationParams {
  cursor?: string | null;
  size?: number;
}

export interface FleetScopedParams extends PaginationParams {
  fleet_ids?: string[];
  fleet_refs?: string[];
  /** ISO bounds for time-windowed telematics list endpoints */
  from_datetime?: string;
  to_datetime?: string;
}
