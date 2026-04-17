/**
 * OpenAPI-derived endpoint catalog (pinned SHA inside openapi-endpoint-catalog.json).
 * Phantom rows document names from product checklists that are not present in public specs.
 */
import catalogJson from "./openapi-endpoint-catalog.json";
import phantomJson from "./phantom-endpoints.json";

export type CatalogRow = {
  id: string;
  service: string;
  method: string;
  pathTemplate: string;
  category: string;
  operationSummary: string;
  operationId?: string | null;
  phantomReason?: string;
};

const baseRows = catalogJson.endpoints as CatalogRow[];
const phantomRows = (phantomJson.endpoints as CatalogRow[]).map((r) => ({
  ...r,
  service: "phantom",
}));

export const SPEC_SOURCE_SHA = catalogJson.specSourceSha;

/** Every HTTP operation in public OpenAPI + phantom checklist rows */
export const ENDPOINT_CATALOG: CatalogRow[] = [...baseRows, ...phantomRows];

export const PATHS = {
  token: "/protocol/openid-connect/token",
  fleets: "/v2/orgs/fleets",
  fleet: (id: string) => `/v2/orgs/fleets/${id}`,
  connections: "/v2/integrations/connections",
  connection: (id: string) => `/v2/integrations/connections/${id}`,
  vehicles: "/v2/telematics/vehicles",
  vehicle: (id: string) => `/v2/telematics/vehicles/${id}`,
  analyticsOverview: "/v2/telematics/analytics/overview",
} as const;
