/**
 * Phase 0 API exploration against Catena public OpenAPI surface.
 *
 * Sandbox note: webhook delivery for the Sandbox fleet is not reliable (fleet hydration bypasses EDA);
 * prefer REST for demos — see SANDBOX_WEBHOOK_NOTE in generated COVERAGE.md for notification routes.
 */
import "./load-env";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { subDays } from "date-fns/subDays";
import { createCatenaClientFromEnv, describeResponseShape } from "../src/lib/catena/client";
import { ENDPOINT_CATALOG, SPEC_SOURCE_SHA, type CatalogRow } from "../src/lib/catena/endpoints";
import { SANDBOX_WEBHOOKS_DO_NOT_FIRE } from "../src/lib/catena/sandbox-notes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXPLORATION_DIR = path.join(ROOT, "exploration");

const SPEC_URLS: Record<string, string> = {
  telematics:
    "https://raw.githubusercontent.com/catenaclearing/catena-sdk-go/main/specs/telematics/openapi.json",
  integrations:
    "https://raw.githubusercontent.com/catenaclearing/catena-sdk-go/main/specs/integrations/openapi.json",
  orgs: "https://raw.githubusercontent.com/catenaclearing/catena-sdk-go/main/specs/orgs/openapi.json",
  notifications:
    "https://raw.githubusercontent.com/catenaclearing/catena-sdk-go/main/specs/notifications/openapi.json",
  authentication:
    "https://raw.githubusercontent.com/catenaclearing/catena-sdk-go/main/specs/authentication/openapi.json",
};

const SANDBOX_WEBHOOK_NOTE = SANDBOX_WEBHOOKS_DO_NOT_FIRE;

type ProbeContext = Record<string, string>;

function extractItems(data: unknown): unknown[] {
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.items)) return o.items;
  if (Array.isArray(o.data)) return o.data;
  if (Array.isArray(data)) return data;
  return [];
}

function countRecords(data: unknown): number {
  const items = extractItems(data);
  return items.length;
}

function sampleRecord(data: unknown): unknown {
  const items = extractItems(data);
  return items[0] ?? (typeof data === "object" && data !== null && !Array.isArray(data) ? data : null);
}

function pathParams(pathTemplate: string): string[] {
  const out: string[] = [];
  const re = /\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pathTemplate)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function fillPath(pathTemplate: string, ctx: ProbeContext): string | null {
  let out = pathTemplate;
  for (const key of pathParams(pathTemplate)) {
    const v = ctx[key];
    if (!v) return null;
    out = out.replace(`{${key}}`, encodeURIComponent(v));
  }
  return out;
}

function learnFromList(pathTemplate: string, data: unknown, ctx: ProbeContext) {
  const items = extractItems(data);
  const first = items[0] as Record<string, unknown> | undefined;
  const id = first && typeof first.id === "string" ? first.id : undefined;
  if (!id) return;

  const map: Record<string, string> = {
    "/v2/orgs/fleets": "fleet_id",
    "/v2/orgs/tsps": "tsp_id",
    "/v2/integrations/tsps": "tsp_id",
    "/v2/integrations/connections": "connection_id",
    "/v2/telematics/vehicles": "vehicle_id",
    "/v2/telematics/trailers": "trailer_id",
    "/v2/telematics/users": "user_id",
    "/v2/orgs/invitations": "invitation_id",
    "/v2/orgs/share_agreements": "share_agreement_id",
    "/v2/orgs/partners": "partner_id",
    "/v2/notifications/webhooks": "webhook_id",
    "/v2/telematics/dvir-logs": "dvir_log_id",
    "/v2/telematics/hos-events": "hos_event_id",
    "/v2/integrations/connections/{connection_id}/schedules": "schedule_id",
    "/v2/orgs/fleets/{fleet_id}/properties": "property_id",
    "/v2/orgs/partners/{partner_id}/properties": "property_id",
  };
  const key = map[pathTemplate];
  if (key) ctx[key] = id;
  if (pathTemplate === "/v2/orgs/fleets") ctx.primary_fleet_id = id;
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
  return (await r.json()) as Record<string, unknown>;
}

function opKey(method: string, pathTemplate: string) {
  return `${method.toLowerCase()} ${pathTemplate}`;
}

function buildDefaultQuery(
  spec: Record<string, unknown> | undefined,
  method: string,
  pathTemplate: string,
  ctx: ProbeContext,
): Record<string, unknown> {
  const paths = spec?.paths as Record<string, Record<string, unknown>> | undefined;
  const op = paths?.[pathTemplate]?.[method.toLowerCase()] as
    | { parameters?: { name: string; in: string; schema?: unknown }[] }
    | undefined;
  const params = op?.parameters?.filter((p) => p.in === "query") ?? [];
  const q: Record<string, unknown> = { size: 50 };
  const names = new Set(params.map((p) => p.name));
  if (names.has("from_datetime") && names.has("to_datetime")) {
    const to = new Date();
    const from = subDays(to, 30);
    q.from_datetime = from.toISOString();
    q.to_datetime = to.toISOString();
  }
  if (names.has("period_days")) q.period_days = 30;
  if (names.has("fleet_ids") && ctx.primary_fleet_id) {
    q.fleet_ids = [ctx.primary_fleet_id];
  }
  return q;
}

function summarizeRequestBody(
  spec: Record<string, unknown> | undefined,
  method: string,
  pathTemplate: string,
): string {
  const paths = spec?.paths as Record<string, Record<string, unknown>> | undefined;
  const op = paths?.[pathTemplate]?.[method.toLowerCase()] as { requestBody?: { content?: unknown } } | undefined;
  if (!op?.requestBody) return "TODO: no requestBody on operation";
  return JSON.stringify(op.requestBody).slice(0, 2000);
}

const PILOT_OPERATION_IDS = new Set([
  "list_fleets",
  "get_fleet",
  "list_tsps",
  "get_tsp",
  "list_invitations",
  "list_share_agreements",
  "get_share_agreement",
  "list_connections",
  "get_connection",
  "list_vehicles",
  "get_vehicle",
  "list_trailers",
  "get_trailer",
  "list_vehicle_locations",
  "list_vehicle_live_locations",
  "list_trailer_live_locations",
  "list_users",
  "get_user",
  "list_driver_safety_events",
  "list_hos_events",
  "list_hos_violations",
  "list_hos_availabilities",
  "list_hos_daily_snapshots",
  "list_dvir_logs",
  "list_dvir_log_defects",
  "list_ifta_summaries",
  "list_engine_logs",
  "get_analytics_overview",
  "list_fleet_summaries",
  "get_fleet_growth_metrics",
  "list_vehicle_summaries",
  "get_vehicle_growth_metrics",
  "list_driver_summaries",
  "get_driver_growth_metrics",
  "list_trailer_summaries",
  "get_trailer_growth_metrics",
]);

function whyNotTemplate(row: CatalogRow): string {
  const c = row.category.toLowerCase();
  const p = row.pathTemplate.toLowerCase();
  if (row.service === "phantom") return row.phantomReason ?? "Not in public OpenAPI";
  if (c.includes("reference")) return "Lookup table — cached at startup, not a primary data surface";
  if (row.method !== "GET") return "Out of scope for a read-heavy insurance pilot";
  if (p.includes("/trailers")) return "Trailers are not a primary risk signal for commercial auto underwriting — would revisit for a freight broker or shipper customer";
  if (p.includes("/schedules") || p.includes("executions") || p.includes("backfill"))
    return "Relevant for a batch processing workflow, not on-demand underwriting — flagged in product recommendations as the path to webhook-driven alerts";
  if (p.includes("/notifications/webhooks"))
    return "Webhook subscriptions — Sandbox fleet does not deliver events via EDA; use REST for pilot.";
  if (p.includes("resource")) return "Meta-discovery endpoints, not needed when endpoints are known at build time";
  if (p.includes("invitation") || p.includes("share_agreement"))
    return "Happy-path only for pilot; lifecycle management required for production hardening";
  if (c.includes("partner")) return "Partners admin surface — not required for initial underwriting views";
  if (p.includes("sensor")) return "Sensor stream — optional enrichment beyond core HOS/location/safety signals";
  if (p.includes("attachments")) return "Attachment binary metadata — not needed for tabular pilot UI";
  return "Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI.";
}

function pilotUseLabel(row: CatalogRow): string {
  if (row.operationId && PILOT_OPERATION_IDS.has(row.operationId)) return "Yes";
  return "No";
}

function webhookExtraNote(row: CatalogRow): string {
  if (!row.pathTemplate.includes("/notifications/webhooks")) return "";
  return ` ${SANDBOX_WEBHOOK_NOTE}`;
}

async function bootstrapContext(client: ReturnType<typeof createCatenaClientFromEnv>, ctx: ProbeContext) {
  try {
    const fleets = await client.apiGet("/v2/orgs/fleets", { size: 25 });
    learnFromList("/v2/orgs/fleets", fleets, ctx);
  } catch {
    /* ignore */
  }
  try {
    const conns = await client.apiGet("/v2/integrations/connections", { size: 25 });
    learnFromList("/v2/integrations/connections", conns, ctx);
  } catch {
    /* ignore */
  }
  if (ctx.connection_id) {
    try {
      const sch = await client.apiGet(
        `/v2/integrations/connections/${ctx.connection_id}/schedules`,
        { size: 25 },
      );
      learnFromList("/v2/integrations/connections/{connection_id}/schedules", sch, ctx);
    } catch {
      /* ignore */
    }
  }
  if (ctx.fleet_id) {
    try {
      const fp = await client.apiGet(`/v2/orgs/fleets/${ctx.fleet_id}/properties`, { size: 25 });
      learnFromList("/v2/orgs/fleets/{fleet_id}/properties", fp, ctx);
    } catch {
      /* ignore */
    }
  }
  try {
    const partners = await client.apiGet("/v2/orgs/partners", { size: 25 });
    learnFromList("/v2/orgs/partners", partners, ctx);
  } catch {
    /* ignore */
  }
  if (ctx.partner_id) {
    try {
      const pp = await client.apiGet(`/v2/orgs/partners/${ctx.partner_id}/properties`, { size: 25 });
      learnFromList("/v2/orgs/partners/{partner_id}/properties", pp, ctx);
    } catch {
      /* ignore */
    }
  }
  const to = new Date();
  const from = subDays(to, 30);
  const tq = { from_datetime: from.toISOString(), to_datetime: to.toISOString(), size: 25 };
  if (ctx.primary_fleet_id) {
    const fq = { fleet_ids: [ctx.primary_fleet_id], ...tq };
    try {
      const veh = await client.apiGet("/v2/telematics/vehicles", { fleet_ids: [ctx.primary_fleet_id], size: 25 });
      learnFromList("/v2/telematics/vehicles", veh, ctx);
    } catch {
      /* ignore */
    }
    try {
      const dvir = await client.apiGet("/v2/telematics/dvir-logs", fq);
      learnFromList("/v2/telematics/dvir-logs", dvir, ctx);
    } catch {
      /* ignore */
    }
    try {
      const hos = await client.apiGet("/v2/telematics/hos-events", fq);
      learnFromList("/v2/telematics/hos-events", hos, ctx);
    } catch {
      /* ignore */
    }
  }
  ctx.event_name ||= "webhook.created";
  ctx.version ||= "1";
}

async function main() {
  await fs.mkdir(EXPLORATION_DIR, { recursive: true });

  const specDocs: Record<string, Record<string, unknown>> = {};
  for (const [k, url] of Object.entries(SPEC_URLS)) {
    specDocs[k] = await fetchJson(url);
  }

  const client = createCatenaClientFromEnv();
  const ctx: ProbeContext = {};
  await bootstrapContext(client, ctx);

  const rows = [...ENDPOINT_CATALOG].sort((a, b) => {
    const da = pathParams(a.pathTemplate).length;
    const db = pathParams(b.pathTemplate).length;
    return da - db || a.id.localeCompare(b.id);
  });

  type RowResult = {
    row: CatalogRow;
    status: string;
    ms?: number;
    recordCount?: number;
    error?: string;
    sample?: unknown;
    shape?: unknown;
    raw?: unknown;
    skippedWriteBody?: string;
  };

  const resultById = new Map<string, RowResult>();

  for (const row of rows) {
    if (row.service === "phantom") {
      resultById.set(row.id, {
        row,
        status: "NOT_IN_PUBLIC_SPEC",
        error: row.phantomReason,
        shape: { phantom: true },
      });
      continue;
    }

    if (row.service === "authentication") {
      resultById.set(row.id, {
        row,
        status: "OK_OAUTH_VIA_CLIENT",
        ms: 0,
        recordCount: 0,
        shape: { note: "Token exchange performed by CatenaClient; not invoked as a separate catalog HTTP call." },
      });
      continue;
    }

    if (row.method !== "GET") {
      const spec = specDocs[row.service];
      resultById.set(row.id, {
        row,
        status: "SKIPPED_WRITE",
        skippedWriteBody: summarizeRequestBody(spec, row.method, row.pathTemplate),
        shape: { skipped: true },
      });
      continue;
    }
  }

  const getRows = rows.filter(
    (r) => r.method === "GET" && r.service !== "authentication" && r.service !== "phantom",
  );

  for (let pass = 0; pass < 30; pass++) {
    let progressed = false;
    for (const row of getRows) {
      if (resultById.has(row.id)) continue;
      const spec = specDocs[row.service];
      const filled = fillPath(row.pathTemplate, ctx);
      if (!filled && pathParams(row.pathTemplate).length > 0) continue;

      const query = buildDefaultQuery(spec, row.method, row.pathTemplate, ctx);
      const t0 = Date.now();
      try {
        const data = await client.apiGet(filled!, query);
        const ms = Date.now() - t0;
        const rc = countRecords(data);
        learnFromList(row.pathTemplate, data, ctx);
        resultById.set(row.id, {
          row,
          status: "OK",
          ms,
          recordCount: rc,
          sample: sampleRecord(data),
          shape: describeResponseShape(data),
          raw: data,
        });
        progressed = true;
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { status?: number; data?: unknown } };
        resultById.set(row.id, {
          row,
          status: "ERROR",
          ms: Date.now() - t0,
          error: `${err.response?.status ?? "?"} ${err.message ?? String(e)}`,
          shape: describeResponseShape(err.response?.data),
          raw: err.response?.data,
        });
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  for (const row of getRows) {
    if (resultById.has(row.id)) continue;
    const needs = pathParams(row.pathTemplate);
    resultById.set(row.id, {
      row,
      status: "EMPTY_LIST_NO_DETAIL_PROBE",
      error: `Missing path params after chained probes: ${needs.join(", ")}`,
      shape: null,
    });
  }

  const results: RowResult[] = rows.map((row) => resultById.get(row.id)!);

  for (const r of results) {
    await fs.writeFile(path.join(EXPLORATION_DIR, `${r.row.id}.json`), JSON.stringify(r, null, 2));
  }

  const total = results.length;
  const ok = results.filter((r) => r.status === "OK").length;
  const okDetail = results.filter((r) => r.status === "OK" && pathParams(r.row.pathTemplate).length > 0).length;
  const okList = ok - okDetail;
  const skippedWrite = results.filter((r) => r.status === "SKIPPED_WRITE").length;
  const skippedOAuth = results.filter((r) => r.status === "OK_OAUTH_VIA_CLIENT").length;
  const phantom = results.filter((r) => r.status === "NOT_IN_PUBLIC_SPEC").length;
  const empty = results.filter((r) => r.status === "EMPTY_LIST_NO_DETAIL_PROBE").length;
  const err = results.filter((r) => r.status === "ERROR").length;
  const denom = total - skippedOAuth;
  const pct = denom ? (((ok + skippedWrite + phantom + empty) / denom) * 100).toFixed(1) : "0";

  const coverageLines = [
    "| Endpoint | Method | Category | Status | Used in Pilot? | Notes |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const r of results) {
    const notes = `${whyNotTemplate(r.row)}${webhookExtraNote(r.row)}`.replace(/\|/g, "\\|");
    coverageLines.push(
      `| ${r.row.pathTemplate} | ${r.row.method} | ${r.row.category} | ${r.status} | ${pilotUseLabel(r.row)} | ${notes} |`,
    );
  }
  await fs.writeFile(path.join(EXPLORATION_DIR, "COVERAGE.md"), [...coverageLines, "", `> ${SANDBOX_WEBHOOK_NOTE}`, ""].join("\n"));

  const report = [
    "# Catena API exploration report",
    "",
    `OpenAPI pin: \`catena-sdk-go@${SPEC_SOURCE_SHA}\``,
    "",
    "## Section 1: Endpoints used in Catena Risk (primary)",
    "",
    "_Edit this mapping as the product surface solidifies._",
    "",
    ...results
      .filter((r) => pilotUseLabel(r.row) === "Yes")
      .map((r) => {
        return [
          `### ${r.row.operationSummary} (\`${r.row.pathTemplate}\`)`,
          "",
          `- **Status**: ${r.status}`,
          `- **Latency (ms)**: ${r.ms ?? "n/a"}`,
          `- **Row count**: ${r.recordCount ?? "n/a"}`,
          `- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_`,
          "",
          "**Sample record**",
          "",
          "```json",
          JSON.stringify(r.sample ?? null, null, 2),
          "```",
          "",
        ].join("\n");
      }),
    "## Section 2: Evaluated but not used (with reasoning)",
    "",
    ...results
      .filter((r) => pilotUseLabel(r.row) === "No")
      .map((r) => {
        return [
          `### ${r.row.operationSummary} (\`${r.row.pathTemplate}\`)`,
          "",
          `- **Status**: ${r.status}`,
          `- **Why not (seed)**: ${whyNotTemplate(r.row)}${webhookExtraNote(r.row)}`,
          "",
          r.status === "SKIPPED_WRITE"
            ? ["**Request body (OpenAPI excerpt)**", "```", r.skippedWriteBody ?? "", "```", ""].join("\n")
            : "",
          r.sample && r.status === "OK"
            ? ["**Sample**", "```json", JSON.stringify(r.sample, null, 2), "```", ""].join("\n")
            : "",
        ].join("\n");
      }),
    "## Section 3: Coverage summary",
    "",
    "| Metric | Count |",
    "| --- | ---:|",
    `| Total catalog rows | ${total} |`,
    `| Successful GET (list / no path params) | ${okList} |`,
    `| Successful GET (detail / path params) | ${okDetail} |`,
    `| Skipped writes (POST/PATCH/DELETE) | ${skippedWrite} |`,
    `| OAuth rows (documented only) | ${skippedOAuth} |`,
    `| Phantom / not in public spec | ${phantom} |`,
    `| Empty list → no detail probe | ${empty} |`,
    `| Errors | ${err} |`,
    `| Coverage % (OK + skipped write + phantom + empty over non-OAuth rows) | ${pct}% |`,
    "",
    `> ${SANDBOX_WEBHOOK_NOTE}`,
    "",
  ].join("\n");

  await fs.writeFile(path.join(EXPLORATION_DIR, "REPORT.md"), report);

  // Console summary
  // eslint-disable-next-line no-console
  console.log("\n=== Catena exploration summary ===\n");
  // eslint-disable-next-line no-console
  console.table(
    results.map((r) => ({
      id: r.row.id,
      method: r.row.method,
      status: r.status,
      ms: r.ms ?? "",
      records: r.recordCount ?? "",
    })),
  );
  // eslint-disable-next-line no-console
  console.log("\nArtifacts:", EXPLORATION_DIR);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
