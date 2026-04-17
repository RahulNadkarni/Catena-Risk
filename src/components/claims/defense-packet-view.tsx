import dynamic from "next/dynamic";
import { format } from "date-fns";
import type { DefensePacket, ClaimStatus } from "@/lib/claims/types";
import { IncidentTimelineChart } from "@/components/claims/incident-timeline-chart";
import { HosGrid } from "@/components/claims/hos-grid";
import { EventLogTable } from "@/components/claims/event-log-table";
import { InlineMarkdown } from "@/components/report/inline-markdown";
import { NarrativeCopy } from "@/components/report/narrative-copy";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

const ClaimMap = dynamic(() => import("@/components/claims/claim-map"), { ssr: false });

interface Props {
  claimId: string;
  claimNumber: string;
  status: ClaimStatus;
  packet: DefensePacket;
}

function DispositionBadge({ disposition }: { disposition: DefensePacket["disposition"] }) {
  if (disposition === "STRONG_DEFENSE_POSITION") {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1">
        Strong defense position
      </Badge>
    );
  }
  if (disposition === "UNFAVORABLE_EVIDENCE_CONSIDER_SETTLEMENT") {
    return (
      <Badge variant="destructive" className="text-sm px-3 py-1">
        Unfavorable evidence — consider settlement
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-sm px-3 py-1">Neutral — further investigation</Badge>;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-muted-foreground text-sm">{k}</span>
      <span className="metric-tabular text-sm font-medium text-right">{v}</span>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`metric-tabular text-lg font-semibold ${danger ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

function fmtDate(iso: string) {
  try {
    return format(new Date(iso), "MMM d, yyyy HH:mm 'UTC'");
  } catch {
    return iso;
  }
}

function fmtDateShort(iso: string) {
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

export function DefensePacketView({ claimId: _id, claimNumber, status, packet }: Props) {
  void _id;
  const {
    incidentAt,
    incidentLocation,
    incidentDescription,
    driverName,
    vehicleUnit,
    vehicleVin,
    speedTimeline,
    speedLimitMph,
    speedAtImpactMph,
    maxSpeedInWindowMph,
    safetyEventsWindow,
    hosSnapshot,
    dvirRecords,
    routeWaypoints,
    fuelStops,
    driverSafetyScore,
    driverHosViolations90d,
    driverTenureMonths,
    defenseNarrative,
    disposition,
    dispositionRationale,
    dispositionFactors,
  } = packet;

  const unresolvedCritical = dvirRecords
    .flatMap((r) => r.defects)
    .filter((d) => d.severity === "critical" && !d.resolvedAt);

  const isOverLimit = speedAtImpactMph > speedLimitMph;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8">
      {/* ── Left column: 10 sections ─────────────────────────────────────── */}
      <div className="space-y-8 min-w-0">

        {/* 1. Incident header */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Claim</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight font-mono">{claimNumber}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{incidentDescription}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <DispositionBadge disposition={disposition} />
              <Badge variant="outline" className="capitalize">{status.replace(/_/g, " ")}</Badge>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid gap-1 sm:grid-cols-2">
            <Row k="Incident date/time" v={fmtDate(incidentAt)} />
            <Row k="Location" v={incidentLocation} />
            <Row k="Driver" v={driverName} />
            <Row k="Vehicle unit" v={vehicleUnit} />
            <Row k="VIN" v={vehicleVin} />
            <Row k="Defense packet generated" v={fmtDate(new Date().toISOString())} />
          </div>
        </section>

        {/* 2. Speed timeline chart */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Speed telemetry (72 min pre-incident)</h2>
          <Card>
            <CardContent className="pt-4">
              <IncidentTimelineChart
                speedTimeline={speedTimeline}
                speedLimitMph={speedLimitMph}
                speedAtImpactMph={speedAtImpactMph}
                safetyEvents={safetyEventsWindow}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Metric label="Speed at impact" value={`${speedAtImpactMph} mph`} danger={isOverLimit} />
                <Metric label="Max speed in window" value={`${maxSpeedInWindowMph.toFixed(1)} mph`} danger={maxSpeedInWindowMph > speedLimitMph} />
                <Metric label="Posted speed limit" value={`${speedLimitMph} mph`} />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. Safety events */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Pre-incident safety events (30 min window)
            {safetyEventsWindow.length === 0 ? (
              <span className="ml-2 text-sm font-normal text-success">— clean window</span>
            ) : (
              <span className="ml-2 text-sm font-normal text-destructive">— {safetyEventsWindow.length} event(s)</span>
            )}
          </h2>
          <EventLogTable events={safetyEventsWindow} />
        </section>

        {/* 4. HOS snapshot */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Hours of service snapshot</h2>
            {hosSnapshot.isCompliant && hosSnapshot.hoursUntilDriveLimit >= 2 ? (
              <Badge className="bg-emerald-600 text-white">Compliant</Badge>
            ) : (
              <Badge variant="destructive">At limit</Badge>
            )}
          </div>
          <Card>
            <CardContent className="pt-4">
              <HosGrid snapshot={hosSnapshot} />
              {hosSnapshot.violationNote ? (
                <p className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2 border border-amber-200">
                  {hosSnapshot.violationNote}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>

        {/* 5. DVIR records */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">DVIR records (60-day window)</h2>
            {unresolvedCritical.length === 0 ? (
              <Badge className="bg-emerald-600 text-white">No open defects</Badge>
            ) : (
              <Badge variant="destructive">{unresolvedCritical.length} critical unresolved</Badge>
            )}
          </div>
          <div className="space-y-2">
            {dvirRecords.map((rec) => (
              <Collapsible key={rec.id}>
                <Card>
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{fmtDateShort(rec.inspectedAt)} — {rec.type.replace(/_/g, " ")}</CardTitle>
                        <Badge variant={rec.status === "satisfactory" ? "outline" : "destructive"}>
                          {rec.status === "satisfactory" ? "Satisfactory" : "Unsatisfactory"}
                        </Badge>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {rec.defects.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No defects recorded.</p>
                      ) : (
                        <ul className="space-y-2">
                          {rec.defects.map((d) => (
                            <li key={d.id} className="text-sm">
                              <span className={`font-medium ${d.severity === "critical" ? "text-destructive" : d.severity === "major" ? "text-amber-600" : ""}`}>
                                [{d.severity.toUpperCase()}]
                              </span>{" "}
                              {d.component} — {d.note}
                              {d.resolvedAt ? (
                                <span className="ml-2 text-success text-xs">Resolved {fmtDateShort(d.resolvedAt)}</span>
                              ) : (
                                <span className="ml-2 text-destructive text-xs font-semibold">UNRESOLVED</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </section>

        {/* 6. Route replay map */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">72-hour route replay</h2>
          <p className="text-muted-foreground text-sm">
            Route color: teal = within limit, amber = near limit, red = over limit.
          </p>
          <ClaimMap
            routeWaypoints={routeWaypoints}
            incidentLat={packet.incidentLat}
            incidentLng={packet.incidentLng}
            fuelStops={fuelStops}
            speedLimitMph={speedLimitMph}
          />
        </section>

        {/* 7. Fuel stops */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Fuel stops (72-hour window)</h2>
            <Badge variant="outline" className="text-xs">Synthetic — API unavailable</Badge>
          </div>
          <Card>
            <CardContent className="pt-4">
              {fuelStops.length === 0 ? (
                <p className="text-sm text-muted-foreground">No fuel transactions in window.</p>
              ) : (
                <div className="space-y-2">
                  {fuelStops.map((stop) => (
                    <div key={stop.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{stop.locationName}</p>
                        <p className="text-muted-foreground text-xs">{fmtDate(stop.occurredAt)}</p>
                      </div>
                      <div className="text-right metric-tabular">
                        <p>{stop.gallons.toFixed(1)} gal</p>
                        <p className="text-muted-foreground text-xs">${stop.pricePerGallon.toFixed(2)}/gal</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Fuel data via Catena — same unified data layer used for fleet analytics. Note: fuel transaction API is not yet in the public spec; data above is simulated for demo purposes.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 8. Driver history */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Driver safety profile</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Safety score" value={`${driverSafetyScore}/100`} danger={driverSafetyScore < 60} />
            <Metric label="HOS violations (90d)" value={String(driverHosViolations90d)} danger={driverHosViolations90d > 3} />
            <Metric label="Tenure" value={`${driverTenureMonths} months`} />
          </div>
        </section>

        {/* 9. Defense narrative */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Defense narrative</h2>
            <NarrativeCopy text={defenseNarrative.replace(/\*\*/g, "")} />
          </div>
          <Card>
            <CardContent className="pt-6">
              <InlineMarkdown text={defenseNarrative} />
              <p className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">
                All claims data is synthetic and generated for demonstration purposes. This narrative should not be used as legal advice.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 10. Disposition summary */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Disposition</h2>
          <Card className={disposition === "STRONG_DEFENSE_POSITION" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
            <CardContent className="pt-6 space-y-3">
              <DispositionBadge disposition={disposition} />
              <p className="text-sm">{dispositionRationale}</p>
              <ul className="space-y-1">
                {dispositionFactors.map((f, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-muted-foreground">—</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Actions footer */}
        <section className="flex flex-wrap gap-3 pb-8">
          <button
            type="button"
            disabled
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-muted-foreground opacity-60 cursor-not-allowed"
          >
            Export PDF (Phase 5)
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-muted-foreground opacity-60 cursor-not-allowed"
          >
            Share with counsel (Phase 5)
          </button>
        </section>
      </div>

      {/* ── Right rail: provenance & disposition ─────────────────────────── */}
      <aside className="mt-10 space-y-4 lg:mt-0">
        <div className="lg:sticky lg:top-20 space-y-4">
          {/* Disposition card */}
          <Card className={disposition === "STRONG_DEFENSE_POSITION" ? "border-emerald-300" : "border-red-300"}>
            <CardHeader>
              <CardTitle className="text-base">Disposition</CardTitle>
              <CardDescription>Telematics-based recommendation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <DispositionBadge disposition={disposition} />
              <p className="text-sm text-muted-foreground leading-relaxed">{dispositionRationale}</p>
              <Separator />
              <ul className="space-y-1.5">
                {dispositionFactors.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground leading-snug">
                    <span className="mr-1">—</span>{f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Chain of custody */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chain of custody</CardTitle>
              <CardDescription>Evidence provenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row k="Data source" v="Catena Clearing API" />
              <Row k="Telematics window" v="72 hours pre-incident" />
              <Row k="Speed samples" v={`${speedTimeline.length} points (1-min)`} />
              <Row k="Route waypoints" v={`${routeWaypoints.length} points (15-min)`} />
              <Row k="DVIR records" v={`${dvirRecords.length} inspections`} />
              <Row k="Fuel data" v="Synthetic (API N/A)" />
              <Separator className="my-2" />
              <p className="text-muted-foreground text-xs leading-relaxed">
                Evidence integrity: All telematics data retrieved via Catena Clearing&apos;s unified API pipeline. Fuel data is synthetic (Catena fuel API is not yet publicly available). All data is clearly marked as simulated for demo purposes.
              </p>
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
