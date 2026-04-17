import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { subDays } from "date-fns/subDays";
import { z } from "zod";
import { MethodNotInPublicSpecError } from "./errors";
import { CursorPageResponseSchema } from "./schemas/pagination";
import {
  AnalyticsOverviewResponseSchema,
  ListDvirDefectsResponseSchema,
  ListDvirLogsResponseSchema,
  ListDriverSafetyEventsResponseSchema,
  ListEngineLogsResponseSchema,
  ListHosAvailabilitiesResponseSchema,
  ListHosDailySnapshotsResponseSchema,
  ListHosEventsResponseSchema,
  ListHosViolationsResponseSchema,
  ListUsersResponseSchema,
  ListVehicleLocationsResponseSchema,
  ListVehiclesResponseSchema,
} from "./schemas/telematics";
import { ConnectionReadSchema, ListConnectionsResponseSchema } from "./schemas/integrations";
import {
  FleetReadSchema,
  ListFleetsResponseSchema,
  ListInvitationsResponseSchema,
  ListOrgsTspsResponseSchema,
  ListShareAgreementsResponseSchema,
} from "./schemas/orgs";
import type { CatenaUnknown, FleetScopedParams, PaginationParams } from "./types";
import { validateApiResponse } from "./validate-response";

const DEV_LOG =
  process.env.NODE_ENV === "development" || process.env.CATENA_DEBUG === "1";

const JsonObject = z.record(z.string(), z.unknown());
const LoosePage = CursorPageResponseSchema(JsonObject);
/** GET responses like ref tables — cursor page of loosely-typed rows */
const LooseRowPageSchema = LoosePage;

export function describeResponseShape(value: unknown, depth = 0): unknown {
  if (depth > 2) return "(max-depth)";
  if (value === null) return "null";
  const t = typeof value;
  if (t !== "object") return t;
  if (Array.isArray(value)) {
    if (value.length === 0) return { array: "empty" };
    return { array: { len: value.length, item: describeResponseShape(value[0], depth + 1) } };
  }
  const o = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o).slice(0, 40)) {
    const v = o[k];
    const vt = typeof v;
    if (vt === "object" && v !== null && !Array.isArray(v)) {
      out[k] = `{${Object.keys(v as object).slice(0, 12).join(",")}}`;
    } else if (Array.isArray(v)) {
      out[k] = `array(${v.length})`;
    } else {
      out[k] = vt;
    }
  }
  if (Object.keys(o).length > 40) out["…"] = "truncated";
  return out;
}

export interface CatenaClientOptions {
  baseUrl?: string;
  authBaseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  /** If set, skips OAuth and uses this bearer for API calls */
  accessToken?: string | null;
}

export class CatenaClient {
  private readonly apiBase: string;
  private readonly authBase: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null;
  private accessTokenExpiresAt = 0;
  private readonly authHttp: AxiosInstance;
  private readonly apiHttp: AxiosInstance;
  private refreshPromise: Promise<void> | null = null;

  constructor(opts: CatenaClientOptions = {}) {
    this.apiBase = (opts.baseUrl ?? process.env.CATENA_BASE_URL ?? "https://api.catenatelematics.com").replace(
      /\/+$/,
      "",
    );
    this.authBase = (
      opts.authBaseUrl ??
      process.env.CATENA_AUTH_BASE_URL ??
      "https://auth.catenatelematics.com/realms/catena"
    ).replace(/\/+$/, "");
    this.clientId = opts.clientId ?? process.env.CATENA_CLIENT_ID ?? "";
    this.clientSecret = opts.clientSecret ?? process.env.CATENA_CLIENT_SECRET ?? "";
    this.accessToken =
      opts.accessToken ?? process.env.CATENA_ACCESS_TOKEN?.trim() ?? null;

    this.authHttp = axios.create({ baseURL: this.authBase, timeout: 60_000 });
    this.apiHttp = axios.create({ baseURL: this.apiBase, timeout: 120_000 });

    this.apiHttp.interceptors.request.use(async (config) => {
      const token = await this.ensureAccessToken();
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
      if (DEV_LOG) {
        // eslint-disable-next-line no-console
        console.debug("[Catena] →", config.method?.toUpperCase(), config.baseURL, config.url, config.params);
      }
      return config;
    });

    this.apiHttp.interceptors.response.use(
      (res) => {
        if (DEV_LOG) {
          // eslint-disable-next-line no-console
          console.debug(
            "[Catena] ←",
            res.status,
            res.config.url,
            describeResponseShape(res.data),
          );
        }
        return res;
      },
      async (error) => {
        const cfg = error.config as InternalAxiosRequestConfig & { __retry401?: boolean; __retry429?: number };
        if (error.response?.status === 401 && !cfg.__retry401) {
          cfg.__retry401 = true;
          this.invalidateToken();
          await this.ensureAccessToken();
          return this.apiHttp.request(cfg);
        }
        if (error.response?.status === 429) {
          const n = (cfg.__retry429 ?? 0) + 1;
          if (n <= 5) {
            cfg.__retry429 = n;
            const ra = error.response.headers?.["retry-after"];
            const waitMs = ra ? Number(ra) * 1000 : Math.min(30_000, 500 * 2 ** n);
            await new Promise((r) => setTimeout(r, Number.isFinite(waitMs) ? waitMs : 1000 * n));
            return this.apiHttp.request(cfg);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  private invalidateToken() {
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
  }

  private async ensureAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) return this.accessToken;
    if (this.refreshPromise) {
      await this.refreshPromise;
      if (this.accessToken && Date.now() < this.accessTokenExpiresAt) return this.accessToken;
    }
    this.refreshPromise = this.refreshAccessToken();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
    if (!this.accessToken) throw new Error("CatenaClient: failed to obtain access token");
    return this.accessToken;
  }

  private async refreshAccessToken() {
    const staticToken = process.env.CATENA_ACCESS_TOKEN?.trim();
    if (staticToken) {
      this.accessToken = staticToken;
      this.accessTokenExpiresAt = Date.now() + 3600_000;
      return;
    }
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Set CATENA_CLIENT_ID and CATENA_CLIENT_SECRET (or CATENA_ACCESS_TOKEN)");
    }
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: "organization",
    });
    const res = await this.authHttp.post<{ access_token: string; expires_in?: number }>(
      "/protocol/openid-connect/token",
      body,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    const token = res.data.access_token;
    const expSec = res.data.expires_in ?? 300;
    this.accessToken = token;
    this.accessTokenExpiresAt = Date.now() + Math.max(30, expSec - 45) * 1000;
  }

  /** Low-level GET for exploration / advanced use */
  async apiGet<T = CatenaUnknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    const res = await this.apiHttp.get<T>(path, { params });
    return res.data;
  }

  private async apiGetValidated<T>(
    path: string,
    params: Record<string, unknown> | undefined,
    schema: z.ZodType<T>,
    label: string,
  ): Promise<T> {
    const data = await this.apiGet(path, params);
    return validateApiResponse(schema, data, label);
  }

  async apiPatch<T = CatenaUnknown>(path: string, data?: unknown): Promise<T> {
    const res = await this.apiHttp.patch<T>(path, data);
    return res.data;
  }

  async apiPost<T = CatenaUnknown>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.apiHttp.post<T>(path, data, config);
    return res.data;
  }

  async apiDelete<T = CatenaUnknown>(path: string): Promise<T> {
    const res = await this.apiHttp.delete<T>(path);
    return res.data;
  }

  private window30d() {
    const to = new Date();
    const from = subDays(to, 30);
    return { from_datetime: from.toISOString(), to_datetime: to.toISOString() };
  }

  private page(p?: PaginationParams & FleetScopedParams) {
    return {
      size: p?.size ?? 50,
      cursor: p?.cursor ?? undefined,
      fleet_ids: p?.fleet_ids,
      fleet_refs: p?.fleet_refs,
    };
  }

  private timePaged(p?: FleetScopedParams) {
    const win =
      p?.from_datetime && p?.to_datetime
        ? { from_datetime: p.from_datetime, to_datetime: p.to_datetime }
        : this.window30d();
    return { ...this.page(p), ...win };
  }

  // --- Orgs ---
  listFleets(p?: PaginationParams) {
    return this.apiGetValidated(
      "/v2/orgs/fleets",
      { size: p?.size ?? 50, cursor: p?.cursor },
      ListFleetsResponseSchema,
      "listFleets",
    );
  }
  getFleet(fleetId: string) {
    return this.apiGetValidated(`/v2/orgs/fleets/${fleetId}`, undefined, FleetReadSchema, `getFleet:${fleetId}`);
  }
  listOrgsTsps(p?: PaginationParams) {
    return this.apiGetValidated("/v2/orgs/tsps", { size: p?.size ?? 50, cursor: p?.cursor }, ListOrgsTspsResponseSchema, "listOrgsTsps");
  }
  getOrgsTsp(tspId: string) {
    return this.apiGetValidated(`/v2/orgs/tsps/${tspId}`, undefined, JsonObject, `getOrgsTsp:${tspId}`);
  }
  listInvitations(p?: PaginationParams) {
    return this.apiGetValidated(
      "/v2/orgs/invitations",
      { size: p?.size ?? 50, cursor: p?.cursor },
      ListInvitationsResponseSchema,
      "listInvitations",
    );
  }
  createInvitation(body: unknown) {
    return this.apiPost("/v2/orgs/invitations", body);
  }
  getInvitation(id: string) {
    return this.apiGetValidated(`/v2/orgs/invitations/${id}`, undefined, JsonObject, `getInvitation:${id}`);
  }
  deleteInvitation(id: string) {
    return this.apiDelete(`/v2/orgs/invitations/${id}`);
  }
  listShareAgreements(p?: PaginationParams) {
    return this.apiGetValidated(
      "/v2/orgs/share_agreements",
      { size: p?.size ?? 50, cursor: p?.cursor },
      ListShareAgreementsResponseSchema,
      "listShareAgreements",
    );
  }
  getShareAgreement(id: string) {
    return this.apiGetValidated(`/v2/orgs/share_agreements/${id}`, undefined, JsonObject, `getShareAgreement:${id}`);
  }
  createShareAgreement(body: unknown) {
    return this.apiPost("/v2/orgs/share_agreements", body);
  }
  updateShareAgreement(id: string, body: unknown) {
    return this.apiPatch(`/v2/orgs/share_agreements/${id}`, body);
  }
  deleteShareAgreement(id: string) {
    return this.apiDelete(`/v2/orgs/share_agreements/${id}`);
  }
  /** Lifecycle via PATCH status in API; convenience wrappers */
  activateShareAgreement(id: string) {
    return this.updateShareAgreement(id, { status: "active" });
  }
  pauseShareAgreement(id: string) {
    return this.updateShareAgreement(id, { status: "paused" });
  }
  cancelShareAgreement(id: string) {
    return this.updateShareAgreement(id, { status: "cancelled" });
  }

  // --- Integrations ---
  listConnections(p?: PaginationParams) {
    return this.apiGetValidated(
      "/v2/integrations/connections",
      { size: p?.size ?? 50, cursor: p?.cursor },
      ListConnectionsResponseSchema,
      "listConnections",
    );
  }
  getConnection(connectionId: string) {
    return this.apiGetValidated(
      `/v2/integrations/connections/${connectionId}`,
      undefined,
      ConnectionReadSchema,
      `getConnection:${connectionId}`,
    );
  }
  getDataFreshness() {
    throw new MethodNotInPublicSpecError(
      "getDataFreshness",
      "No dedicated endpoint in published OpenAPI",
    );
  }
  listSchedules(connectionId: string, p?: PaginationParams) {
    return this.apiGetValidated(
      `/v2/integrations/connections/${connectionId}/schedules`,
      { size: p?.size ?? 50, cursor: p?.cursor },
      LooseRowPageSchema,
      `listSchedules:${connectionId}`,
    );
  }
  getSchedule(connectionId: string, scheduleId: string) {
    return this.apiGetValidated(
      `/v2/integrations/connections/${connectionId}/schedules/${scheduleId}`,
      undefined,
      JsonObject,
      `getSchedule:${connectionId}:${scheduleId}`,
    );
  }
  listExecutions(connectionId: string, scheduleId: string, p?: PaginationParams) {
    return this.apiGetValidated(
      `/v2/integrations/connections/${connectionId}/schedules/${scheduleId}/executions`,
      { size: p?.size ?? 50, cursor: p?.cursor },
      LooseRowPageSchema,
      `listExecutions:${connectionId}:${scheduleId}`,
    );
  }
  listIntegrationsTsps(p?: PaginationParams) {
    return this.apiGetValidated("/v2/integrations/tsps", { size: p?.size ?? 50, cursor: p?.cursor }, LooseRowPageSchema, "listIntegrationsTsps");
  }
  getIntegrationsTsp(tspId: string) {
    return this.apiGetValidated(`/v2/integrations/tsps/${tspId}`, undefined, JsonObject, `getIntegrationsTsp:${tspId}`);
  }
  /** Alias: “per TSP” in docs maps to GET TSP in integrations service */
  listIntegrationsPerTsp() {
    return this.listIntegrationsTsps();
  }
  listTspIntegrations() {
    return this.listIntegrationsTsps();
  }

  // --- Telematics fleet ops ---
  listVehicles(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/vehicles", this.page(p), ListVehiclesResponseSchema, "listVehicles");
  }
  getVehicle(vehicleId: string) {
    return this.apiGetValidated(`/v2/telematics/vehicles/${vehicleId}`, undefined, JsonObject, `getVehicle:${vehicleId}`);
  }
  listTrailers(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/trailers", this.page(p), LooseRowPageSchema, "listTrailers");
  }
  getTrailer(trailerId: string) {
    return this.apiGetValidated(`/v2/telematics/trailers/${trailerId}`, undefined, JsonObject, `getTrailer:${trailerId}`);
  }
  listVehicleLocations(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/vehicle-locations", this.timePaged(p), ListVehicleLocationsResponseSchema, "listVehicleLocations");
  }
  listTrailerLocations(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/trailer-locations", this.timePaged(p), LooseRowPageSchema, "listTrailerLocations");
  }
  listVehicleLiveLocations(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/analytics/vehicles/live-locations",
      this.page(p),
      LooseRowPageSchema,
      "listVehicleLiveLocations",
    );
  }
  listTrailerLiveLocations(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/analytics/trailers/live-locations",
      this.page(p),
      LooseRowPageSchema,
      "listTrailerLiveLocations",
    );
  }
  listEngineLogs(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/engine-logs", this.timePaged(p), ListEngineLogsResponseSchema, "listEngineLogs");
  }
  listVehicleSensorEvents(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/vehicle-sensor-events",
      this.timePaged(p),
      LooseRowPageSchema,
      "listVehicleSensorEvents",
    );
  }
  getVehicleSensorEvents(vehicleId: string, p?: FleetScopedParams) {
    return this.apiGetValidated(
      `/v2/telematics/vehicles/${vehicleId}/sensor-events`,
      this.timePaged(p),
      LooseRowPageSchema,
      `getVehicleSensorEvents:${vehicleId}`,
    );
  }

  listVehicleRegionSegments() {
    throw new MethodNotInPublicSpecError("listVehicleRegionSegments", "Not in published OpenAPI");
  }
  listEngineStatuses() {
    throw new MethodNotInPublicSpecError("listEngineStatuses", "Not in published OpenAPI");
  }
  listDriverVehicleAssociations() {
    throw new MethodNotInPublicSpecError("listDriverVehicleAssociations", "Not in published OpenAPI");
  }
  listTrailerVehicleAssociations() {
    throw new MethodNotInPublicSpecError("listTrailerVehicleAssociations", "Not in published OpenAPI");
  }
  listResourceOperations() {
    throw new MethodNotInPublicSpecError("listResourceOperations", "Not in published OpenAPI");
  }
  getResourceOperation() {
    throw new MethodNotInPublicSpecError("getResourceOperation", "Not in published OpenAPI");
  }

  // --- Users / safety ---
  listUsers(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/users", this.page(p), ListUsersResponseSchema, "listUsers");
  }
  getUser(userId: string) {
    return this.apiGetValidated(`/v2/telematics/users/${userId}`, undefined, JsonObject, `getUser:${userId}`);
  }
  createUser() {
    throw new MethodNotInPublicSpecError("createUser", "Users are read-only in telematics OpenAPI");
  }
  updateUser() {
    throw new MethodNotInPublicSpecError("updateUser", "Users are read-only in telematics OpenAPI");
  }
  listMessages() {
    throw new MethodNotInPublicSpecError("listMessages", "Not in published OpenAPI");
  }
  createMessage() {
    throw new MethodNotInPublicSpecError("createMessage", "Not in published OpenAPI");
  }
  listDriverSafetyEvents(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/driver-safety-events",
      this.timePaged(p),
      ListDriverSafetyEventsResponseSchema,
      "listDriverSafetyEvents",
    );
  }

  // --- Compliance ---
  listHosEvents(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/hos-events", this.timePaged(p), ListHosEventsResponseSchema, "listHosEvents");
  }
  getHosEventAttachments(hosEventId: string) {
    return this.apiGetValidated(
      `/v2/telematics/hos-events/${hosEventId}/attachments`,
      undefined,
      LooseRowPageSchema,
      `getHosEventAttachments:${hosEventId}`,
    );
  }
  listHosViolations(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/hos-violations",
      this.timePaged(p),
      ListHosViolationsResponseSchema,
      "listHosViolations",
    );
  }
  listHosAvailabilities(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/hos-availabilities",
      this.page(p),
      ListHosAvailabilitiesResponseSchema,
      "listHosAvailabilities",
    );
  }
  listHosDailySnapshots(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/hos-daily-snapshots",
      this.timePaged(p),
      ListHosDailySnapshotsResponseSchema,
      "listHosDailySnapshots",
    );
  }
  listDvirLogs(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/dvir-logs", this.timePaged(p), ListDvirLogsResponseSchema, "listDvirLogs");
  }
  listDvirDefects(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/dvir-defects", this.timePaged(p), ListDvirDefectsResponseSchema, "listDvirDefects");
  }
  getDvirLogDefects(dvirLogId: string) {
    return this.apiGetValidated(
      `/v2/telematics/dvir-logs/${dvirLogId}/defects`,
      undefined,
      ListDvirDefectsResponseSchema,
      `getDvirLogDefects:${dvirLogId}`,
    );
  }
  listIftaSummaries(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/ifta-summaries", this.timePaged(p), LooseRowPageSchema, "listIftaSummaries");
  }

  // --- Reference ---
  listHosRulesets() {
    return this.apiGetValidated("/v2/telematics/ref-hos-rulesets", undefined, LooseRowPageSchema, "listHosRulesets");
  }
  listHosEventCodes() {
    return this.apiGetValidated("/v2/telematics/ref-hos-event-codes", undefined, LooseRowPageSchema, "listHosEventCodes");
  }
  listHosMalfunctionCodes() {
    return this.apiGetValidated(
      "/v2/telematics/ref-hos-malfunction-codes",
      undefined,
      LooseRowPageSchema,
      "listHosMalfunctionCodes",
    );
  }
  listHosRecordOrigins() {
    return this.apiGetValidated("/v2/telematics/ref-hos-record-origins", undefined, LooseRowPageSchema, "listHosRecordOrigins");
  }
  listHosRecordStatuses() {
    return this.apiGetValidated("/v2/telematics/ref-hos-record-statuses", undefined, LooseRowPageSchema, "listHosRecordStatuses");
  }
  listHosRegions() {
    return this.apiGetValidated("/v2/telematics/ref-hos-regions", undefined, LooseRowPageSchema, "listHosRegions");
  }
  listHosViolationCodes() {
    return this.apiGetValidated("/v2/telematics/ref-hos-violation-codes", undefined, LooseRowPageSchema, "listHosViolationCodes");
  }
  listTimezones() {
    return this.apiGetValidated("/v2/telematics/ref-timezones", undefined, LooseRowPageSchema, "listTimezones");
  }

  // --- Analytics ---
  getAnalyticsOverview(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/analytics/overview", this.page(p), AnalyticsOverviewResponseSchema, "getAnalyticsOverview");
  }
  listFleetSummaries(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/analytics/fleets", this.page(p), LooseRowPageSchema, "listFleetSummaries");
  }
  getFleetGrowthTimeSeries(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/analytics/fleets/time-series",
      { ...this.page(p), period_days: 30 },
      JsonObject,
      "getFleetGrowthTimeSeries",
    );
  }
  listVehicleSummaries(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/analytics/vehicles",
      this.page(p),
      LooseRowPageSchema,
      "listVehicleSummaries",
    );
  }
  getVehicleGrowthTimeSeries(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/analytics/vehicles/time-series",
      { ...this.page(p), period_days: 30 },
      JsonObject,
      "getVehicleGrowthTimeSeries",
    );
  }
  listDriverSummaries(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/analytics/drivers", this.page(p), LooseRowPageSchema, "listDriverSummaries");
  }
  getDriverGrowthTimeSeries(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/analytics/drivers/time-series",
      { ...this.page(p), period_days: 30 },
      JsonObject,
      "getDriverGrowthTimeSeries",
    );
  }
  listTrailerSummaries(p?: FleetScopedParams) {
    return this.apiGetValidated("/v2/telematics/analytics/trailers", this.page(p), LooseRowPageSchema, "listTrailerSummaries");
  }
  getTrailerGrowthTimeSeries(p?: FleetScopedParams) {
    return this.apiGetValidated(
      "/v2/telematics/analytics/trailers/time-series",
      { ...this.page(p), period_days: 30 },
      JsonObject,
      "getTrailerGrowthTimeSeries",
    );
  }

  listFuelTransactions() {
    throw new MethodNotInPublicSpecError("listFuelTransactions", "Not in published OpenAPI");
  }
  createFuelTransaction() {
    throw new MethodNotInPublicSpecError("createFuelTransaction", "Not in published OpenAPI");
  }
  createVehicle() {
    throw new MethodNotInPublicSpecError("createVehicle", "Not in published OpenAPI");
  }
  updateVehicle() {
    throw new MethodNotInPublicSpecError("updateVehicle", "Not in published OpenAPI");
  }
  getTrailerStatus() {
    throw new MethodNotInPublicSpecError("getTrailerStatus", "Use getTrailer(id) in published OpenAPI");
  }
}

export function createCatenaClientFromEnv(): CatenaClient {
  return new CatenaClient();
}
