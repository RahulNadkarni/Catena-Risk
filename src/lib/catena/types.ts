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
}
