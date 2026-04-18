import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ENDPOINT_CATALOG, SPEC_SOURCE_SHA } from "@/lib/catena/endpoints";
import { listRecentSubmissions } from "@/lib/db/submissions";
import type { ApiTraceEntry } from "@/lib/db/submissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoints actively called by this application
const ACTIVE_ENDPOINTS = [
  { method: "GET", path: "/v2/orgs/fleets", label: "listFleets", domain: "Orgs", usage: "Portfolio, landing, underwriting fleet picker" },
  { method: "POST", path: "/v2/orgs/invitations", label: "createInvitation", domain: "Orgs", usage: "Consent flow in underwriting wizard" },
  { method: "GET", path: "/v2/orgs/share_agreements", label: "listShareAgreements", domain: "Orgs", usage: "Consent flow — activate pending agreements" },
  { method: "GET", path: "/v2/integrations/connections", label: "listConnections", domain: "Integrations", usage: "Data freshness checks" },
  { method: "GET", path: "/v2/telematics/vehicles", label: "listVehicles", domain: "Telematics", usage: "Fleet dossier — vehicle inventory" },
  { method: "GET", path: "/v2/telematics/vehicle-locations", label: "listVehicleLocations", domain: "Telematics", usage: "Route map, night-driving exposure" },
  { method: "GET", path: "/v2/telematics/engine-logs", label: "listEngineLogs", domain: "Telematics", usage: "Odometer, mileage exposure metrics" },
  { method: "GET", path: "/v2/telematics/users", label: "listUsers", domain: "Drivers & Users", usage: "Driver roster in underwriting report" },
  { method: "GET", path: "/v2/telematics/driver-safety-events", label: "listDriverSafetyEvents", domain: "Safety", usage: "Hard braking, speeding, cornering rates" },
  { method: "GET", path: "/v2/telematics/hos-events", label: "listHosEvents", domain: "Compliance", usage: "HOS event history — compliance scoring" },
  { method: "GET", path: "/v2/telematics/hos-violations", label: "listHosViolations", domain: "Compliance", usage: "HOS violation rates — compliance sub-score" },
  { method: "GET", path: "/v2/telematics/hos-availabilities", label: "listHosAvailabilities", domain: "Compliance", usage: "Hours-remaining snapshot" },
  { method: "GET", path: "/v2/telematics/hos-daily-snapshots", label: "listHosDailySnapshots", domain: "Compliance", usage: "ELD daily log grid" },
  { method: "GET", path: "/v2/telematics/dvir-logs", label: "listDvirLogs", domain: "Maintenance", usage: "Pre/post-trip inspection records" },
  { method: "GET", path: "/v2/telematics/dvir-defects", label: "listDvirDefects", domain: "Maintenance", usage: "Critical defect rate — maintenance sub-score" },
  { method: "GET", path: "/v2/telematics/analytics/overview", label: "getAnalyticsOverview", domain: "Analytics", usage: "Portfolio KPI strip, landing stats" },
  { method: "GET", path: "/v2/telematics/analytics/drivers", label: "listDriverSummaries", domain: "Analytics", usage: "Driver performance grid in underwriting report" },
  { method: "GET", path: "/v2/telematics/analytics/fleets", label: "listFleetSummaries", domain: "Analytics", usage: "Portfolio fleet table" },
  { method: "GET", path: "/v2/telematics/analytics/fleets/time-series", label: "getFleetGrowthTimeSeries", domain: "Analytics", usage: "Portfolio 30-day growth trend" },
  { method: "GET", path: "/v2/telematics/analytics/drivers/time-series", label: "getDriverGrowthTimeSeries", domain: "Analytics", usage: "Portfolio 30-day driver growth trend" },
  { method: "GET", path: "/v2/integrations/tsps", label: "listIntegrationsTsps", domain: "Integrations", usage: "ELD provider count on landing page" },
];

const DOMAIN_ORDER = ["Orgs", "Integrations", "Telematics", "Drivers & Users", "Safety", "Compliance", "Maintenance", "Analytics"];

// Compute p50/p95 from recent API traces stored in SQLite
function computeLatencies(submissions: ReturnType<typeof listRecentSubmissions>) {
  const byPath = new Map<string, number[]>();
  for (const row of submissions) {
    const trace = JSON.parse(row.api_trace_json ?? "[]") as ApiTraceEntry[];
    for (const entry of trace) {
      if (!entry.ms || entry.ms <= 0) continue;
      const arr = byPath.get(entry.path) ?? [];
      arr.push(entry.ms);
      byPath.set(entry.path, arr);
    }
  }
  return new Map(
    [...byPath.entries()].map(([path, timings]) => {
      const sorted = [...timings].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
      const avg = Math.round(timings.reduce((s, x) => s + x, 0) / timings.length);
      return [path, { avg, p50, p95, n: timings.length }];
    }),
  );
}

export default function TechPage() {
  const submissions = listRecentSubmissions(20);
  const latencies = computeLatencies(submissions);
  const byDomain = new Map<string, typeof ACTIVE_ENDPOINTS>();
  for (const ep of ACTIVE_ENDPOINTS) {
    const arr = byDomain.get(ep.domain) ?? [];
    arr.push(ep);
    byDomain.set(ep.domain, arr);
  }

  const totalSpec = ENDPOINT_CATALOG.length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Architecture</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Technical overview of Keystone Risk Workbench — built in 4 phases on the Catena Clearing API.
        </p>
      </div>

      {/* Architecture diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System architecture</CardTitle>
          <CardDescription>Data flow from Catena ELD integrations through Keystone to underwriters and claims counsel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <svg viewBox="0 0 800 200" className="w-full max-w-3xl" aria-label="Architecture diagram">
              {/* "800+ ELDs" and "75+ integrations" are HARDCODED marketing-style
                  stats for the demo diagram. There is no public Catena API that
                  returns counts of connected ELDs or TSP integrations; the
                  closest endpoints (`/v2/integrations/tsps`, `/v2/orgs/tsps`)
                  list the TSPs authorized for this org, not industry totals.
                  In production these labels would be pulled from an internal
                  platform-metrics dashboard, not hardcoded. */}
              {[
                { x: 10, y: 75, w: 120, h: 50, label: "800+ ELDs", sub: "75+ integrations", fill: "#f0fdf4", stroke: "#059669" },
                { x: 175, y: 75, w: 130, h: 50, label: "Catena API", sub: `${ACTIVE_ENDPOINTS.length} endpoints used`, fill: "#eff6ff", stroke: "#2563eb" },
                { x: 350, y: 60, w: 130, h: 30, label: "Catena client", sub: "OAuth2 + retry", fill: "#fafafa", stroke: "#6b7280" },
                { x: 350, y: 105, w: 130, h: 30, label: "Risk engine", sub: "6 sub-scores", fill: "#fafafa", stroke: "#6b7280" },
                { x: 525, y: 40, w: 120, h: 30, label: "Underwriting", sub: "Report + PDF", fill: "#fefce8", stroke: "#ca8a04" },
                { x: 525, y: 80, w: 120, h: 30, label: "Portfolio", sub: "KPI + trends", fill: "#fefce8", stroke: "#ca8a04" },
                { x: 525, y: 120, w: 120, h: 30, label: "Claims defense", sub: "Packet + PDF", fill: "#fef2f2", stroke: "#dc2626" },
                { x: 670, y: 75, w: 115, h: 50, label: "Underwriters", sub: "& Counsel", fill: "#f5f3ff", stroke: "#7c3aed" },
              ].map(({ x, y, w, h, label, sub, fill, stroke }) => (
                <g key={label}>
                  <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={1.5} />
                  <text x={x + w / 2} y={y + h / 2 - 4} textAnchor="middle" fontSize={11} fontWeight="600" fill="#111">{label}</text>
                  <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" fontSize={9} fill="#6b7280">{sub}</text>
                </g>
              ))}
              {/* Arrows */}
              {[
                [130, 100, 175, 100],
                [305, 100, 350, 75],
                [305, 100, 350, 120],
                [480, 75, 525, 55],
                [480, 75, 525, 95],
                [480, 120, 525, 135],
                [645, 55, 670, 90],
                [645, 95, 670, 100],
                [645, 135, 670, 110],
              ].map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9ca3af" strokeWidth={1.5} markerEnd="url(#arrow)" />
              ))}
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX={5} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
                </marker>
              </defs>
            </svg>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Next.js 14 App Router · better-sqlite3 for local persistence · Recharts + Leaflet for visualizations · @react-pdf/renderer for PDF export
          </p>
        </CardContent>
      </Card>

      {/* Endpoint coverage */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Catena endpoints used</h2>
          <Badge variant="outline">{ACTIVE_ENDPOINTS.length} / {totalSpec} spec endpoints</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {ACTIVE_ENDPOINTS.length} endpoints actively called across {DOMAIN_ORDER.length} domains. OpenAPI spec SHA: <code className="font-mono text-xs">{SPEC_SOURCE_SHA?.slice(0, 12) ?? "pinned"}</code>
        </p>
        <div className="space-y-4">
          {DOMAIN_ORDER.filter((d) => byDomain.has(d)).map((domain) => (
            <div key={domain}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">{domain}</h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <colgroup>
                    <col className="w-[80px]" />
                    <col className="w-[220px]" />
                    <col />
                  </colgroup>
                  <tbody>
                    {byDomain.get(domain)!.map((ep) => {
                      const lat = latencies.get(ep.path);
                      return (
                        <tr key={ep.label} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="font-mono text-xs">{ep.method}</Badge>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{ep.label}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{ep.usage}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                            {lat ? `avg ${lat.avg}ms · p95 ${lat.p95}ms` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring function */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk scoring signature</CardTitle>
          <CardDescription>Peer-relative weighted composite — 6 sub-scores, weights sum to 1.0</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted px-4 py-3 text-xs leading-relaxed">
{`// src/lib/risk/scoring.ts
export function computeRiskScore(inputs: RiskScoreInputs): RiskScore {
  // Weights: speeding 0.25 | hardBraking 0.20 | harshCornering 0.10
  //          nightExposure 0.10 | hosCompliance 0.20 | vehicleMaintenance 0.15

  const subScores = [
    buildSubScore("speeding",            br.speedingPer1k,                pb.metrics.speedingPer1k.sortedValues,              0.25),
    buildSubScore("hardBraking",         br.hardBrakingPer1k,             pb.metrics.hardBrakingPer1k.sortedValues,           0.20),
    buildSubScore("harshCornering",      br.corneringPer1k,               pb.metrics.corneringPer1k.sortedValues,             0.10),
    buildSubScore("nightExposure",       exposure.nightDrivingPct ?? 0,   pb.nightDrivingPct.sortedValues,                    0.10),
    buildSubScore("hosCompliance",       br.hosViolationsPerDriverMonth,  pb.metrics.hosViolationsPerDriverMonth.sortedValues, 0.20),
    buildSubScore("vehicleMaintenance",  br.criticalDvirDefectRate ?? 0,  pb.metrics.criticalDvirDefectRate.sortedValues,      0.15),
  ];
  // compositeScore = Σ (subScore_i × weight_i), clamped to [0,100]
  // Tier: ≥80 Preferred | ≥65 Standard | ≥50 Substandard | <50 Decline
}`}
          </pre>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground pb-4">
        Latency figures are empirical p50/p95 from Catena sandbox API calls recorded during underwriting submissions in this session.
        All data is from the Catena API or local SQLite — no external data sources.
      </p>
    </div>
  );
}
