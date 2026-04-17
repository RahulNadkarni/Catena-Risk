import dynamic from "next/dynamic";
import type { ExposureMetrics } from "@/lib/domain/derived-metrics";
import type { FleetDossier } from "@/lib/domain/fleet-dossier";
import type { PeerBenchmarks } from "@/lib/risk/peer-benchmarks";
import type { RiskScore } from "@/lib/risk/scoring";
import { buildUnderwriterNarrative } from "@/lib/risk/explanations";
import type { ProspectPayload, ApiTraceEntry } from "@/lib/db/submissions";
import { ApiTraceDialog } from "@/components/report/api-trace-dialog";
import { DriversTable, type DriverSummaryRow } from "@/components/report/drivers-table";
import { InlineMarkdown } from "@/components/report/inline-markdown";
import { NarrativeCopy } from "@/components/report/narrative-copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const FleetMap = dynamic(() => import("@/components/maps/fleet-map"), { ssr: false });

function tierVariant(tier: RiskScore["tier"]): "default" | "secondary" | "destructive" | "outline" {
  if (tier === "Preferred") return "default";
  if (tier === "Standard") return "secondary";
  if (tier === "Substandard") return "outline";
  return "destructive";
}

function ScoreRing({ value }: { value: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <svg width="112" height="112" viewBox="0 0 100 100" className="shrink-0" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" className="stroke-muted" strokeWidth="10" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        className="stroke-primary"
        strokeWidth="10"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="54" textAnchor="middle" className="fill-foreground text-lg font-semibold">
        {value.toFixed(1)}
      </text>
    </svg>
  );
}

export function RiskReportView({
  submissionId,
  fleetId,
  prospect,
  dossier,
  score,
  peerBenchmarks: _peer,
  apiTrace,
  consentSimulated,
  driverRows,
  exposure,
}: {
  submissionId: string;
  fleetId: string;
  prospect: ProspectPayload;
  dossier: FleetDossier;
  score: RiskScore;
  peerBenchmarks: PeerBenchmarks;
  apiTrace: ApiTraceEntry[];
  consentSimulated: boolean;
  driverRows: DriverSummaryRow[];
  exposure: ExposureMetrics;
}) {
  void _peer;
  const narrative = buildUnderwriterNarrative(score);
  const fleetName =
    dossier.fleet?.name ??
    (typeof dossier.fleet?.fleet_ref === "string" ? dossier.fleet.fleet_ref : null) ??
    fleetId;
  const primaryConnection = dossier.connections[0];
  const sourceLabel = primaryConnection?.source_name ?? dossier.source;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-8">
      <div className="space-y-8 min-w-0">
        <section className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{prospect.legalName ?? "Submission"}</h1>
              {consentSimulated ? (
                <Badge variant="outline">Simulated consent</Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Fleet {fleetName} · {fleetId}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={tierVariant(score.tier)}>{score.tier}</Badge>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="cursor-help">
                    Confidence: {score.confidence}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Derived from window length, active drivers, miles, and connection recency in the dossier.
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="cursor-help">
                    Peer cohort
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Demo peer cohort: fixture dossiers under src/lib/fixtures/fleets plus the live API dossier for this
                  fleet (cached 1 hour).
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ScoreRing value={score.compositeScore} />
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Data window · {score.dataWindowDays} days · fetched {dossier.meta.fetchedAt}
              </p>
              <p className="font-medium">{score.recommendedAction.decision.replace(/_/g, " ")}</p>
              <p className="text-muted-foreground text-xs leading-snug">{score.recommendedAction.rationale}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {score.subScores.map((s) => (
            <Collapsible key={s.category} defaultOpen={false}>
              <Card>
                <CollapsibleTrigger className="w-full text-left">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{formatCategory(s.category)}</CardTitle>
                    <CardDescription className="metric-tabular">
                      Sub-score {s.subScore.toFixed(0)} · peer pct {s.peerPercentile.toFixed(0)} · weight{" "}
                      {(s.weight * 100).toFixed(0)}%
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="text-muted-foreground text-sm">
                    <p>{s.narrative}</p>
                    <p className="mt-2 metric-tabular text-xs">
                      Raw {s.rawValue.toFixed(4)} · contribution {(s.contributionToFinalScore * 100).toFixed(1)} pts
                    </p>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Underwriter narrative</h2>
            <NarrativeCopy text={narrative.replace(/\*\*/g, "")} />
          </div>
          <Card>
            <CardContent className="pt-6">
              <InlineMarkdown text={narrative} />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Top risk drivers</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {score.topRiskDrivers.map((s) => (
              <li key={s.category}>
                <span className="capitalize text-foreground">{s.category}</span> — {s.narrative}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Exposure</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Total miles (approx.)" value={exposure.totalMiles.toFixed(0)} />
            <Metric label="Active vehicles" value={String(exposure.activeVehicleCount)} />
            <Metric label="Active drivers" value={String(exposure.activeDriverCount)} />
            <Metric label="Night driving %" value={fmtPct(exposure.nightDrivingPct)} />
            <Metric label="Weekend driving %" value={fmtPct(exposure.weekendDrivingPct)} />
            <Metric label="Urban heuristic %" value={fmtPct(exposure.urbanDrivingPct)} />
          </div>
          <p className="text-muted-foreground text-xs">
            Region polygons are unavailable; urban share uses a heuristic when segments are missing.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Vehicle locations</h2>
          <FleetMap locations={dossier.vehicleLocations} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Driver roster</h2>
          <DriversTable rows={driverRows} submissionId={submissionId} />
        </section>

        <section className="flex flex-wrap gap-3 pb-8">
          <a
            href={`/api/pdf/underwriting/${submissionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition"
          >
            Export as PDF
          </a>
          <Button type="button" variant="destructive" disabled>
            Decline in AMS (coming soon)
          </Button>
        </section>
      </div>

      <aside className="mt-10 space-y-4 lg:mt-0">
        <div className="lg:sticky lg:top-20 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provenance</CardTitle>
              <CardDescription>How this dossier was sourced.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row k="Source" v={String(sourceLabel)} />
              <Row k="Dossier mode" v={dossier.source} />
              <Row k="Vehicles sampled" v={String(dossier.vehicles.length)} />
              <Row k="Users sampled" v={String(dossier.users.length)} />
              <Row k="Location pings" v={String(dossier.vehicleLocations.length)} />
              <Row k="Safety events" v={String(dossier.safetyEvents.length)} />
              <Separator className="my-3" />
              <p className="text-muted-foreground text-xs">
                Endpoint timings are merged into the API trace dialog alongside consent calls.
              </p>
              <ApiTraceDialog entries={apiTrace} />
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="metric-tabular text-right font-medium">{v}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="metric-tabular text-lg font-semibold">{value}</p>
    </div>
  );
}

function fmtPct(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function formatCategory(c: string) {
  return c
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (x) => x.toUpperCase())
    .trim();
}
