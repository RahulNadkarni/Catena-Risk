import dynamic from "next/dynamic";
import { ShareCounselButton } from "@/components/claims/share-counsel-button";
import { format } from "date-fns";
import type { IncidentPacket, ClaimStatus } from "@/lib/claims/types";
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
  packet: IncidentPacket;
}

function CompletenessBadge({ status }: { status: IncidentPacket["dataCompleteness"]["status"] }) {
  if (status === "COMPLETE") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1">Complete</Badge>;
  }
  if (status === "PARTIAL") {
    return <Badge variant="outline" className="text-sm px-3 py-1">Partial data</Badge>;
  }
  return <Badge variant="secondary" className="text-sm px-3 py-1">Synthetic fallback</Badge>;
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

export function DefensePacketView({ claimId, claimNumber, status, packet }: Props) {
  const {
    incidentAt,
    incidentLocation,
    incidentDescription,
    driverName,
    vehicleUnit,
    vehicleVin,
    speedTimeline,
    postedSpeedLimitMph,
    speedAtImpactMph,
    maxSpeedInWindowMph,
    safetyEventsInWindow,
    hosSnapshot,
    dvirRecords,
    routeWaypoints,
    tripOrigin,
    driverHosViolations90d,
    driverSafetyEvents30d,
    driverHosViolations30d,
    driverTenureMonths,
    incidentSummary,
    dataCompleteness,
    dataProvenance,
    evidenceManifest,
    weatherContext,
    roadContext,
    carrierContext,
  } = packet;

  const unresolvedCritical = dvirRecords
    .flatMap((r) => r.defects)
    .filter((d) => d.severity === "critical" && !d.resolvedAt);

  const isOverLimit = postedSpeedLimitMph != null && speedAtImpactMph > postedSpeedLimitMph;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8">
      {/* ── Left column ──────────────────────────────────────────────────── */}
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
              <CompletenessBadge status={dataCompleteness.status} />
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
            <Row k="Report generated" v={fmtDate(new Date().toISOString())} />
          </div>
        </section>

        {/* 2. Speed timeline chart */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Speed telemetry (72 min pre-incident)</h2>
          <Card>
            <CardContent className="pt-4">
              <IncidentTimelineChart
                speedTimeline={speedTimeline}
                postedSpeedLimitMph={postedSpeedLimitMph}
                speedAtImpactMph={speedAtImpactMph}
                safetyEvents={safetyEventsInWindow}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Metric label="Speed at impact" value={`${speedAtImpactMph} mph`} danger={isOverLimit} />
                <Metric
                  label="Max speed in window"
                  value={`${maxSpeedInWindowMph.toFixed(1)} mph`}
                  danger={postedSpeedLimitMph != null && maxSpeedInWindowMph > postedSpeedLimitMph}
                />
                <Metric
                  label="Posted speed limit"
                  value={postedSpeedLimitMph != null ? `${postedSpeedLimitMph} mph` : "Unavailable"}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. Safety events */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Pre-incident safety events (30 min window)
            {safetyEventsInWindow.length === 0 ? (
              <span className="ml-2 text-sm font-normal text-success">— clean window</span>
            ) : (
              <span className="ml-2 text-sm font-normal text-destructive">— {safetyEventsInWindow.length} event(s)</span>
            )}
          </h2>
          <EventLogTable events={safetyEventsInWindow} />
        </section>

        {/* 4. HOS snapshot */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Hours of service snapshot</h2>
            {hosSnapshot.isCompliant && hosSnapshot.hoursUntilDriveLimit >= 2 ? (
              <Badge className="bg-emerald-600 text-white">Compliant</Badge>
            ) : (
              <Badge variant="destructive">Near limit</Badge>
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
          {dvirRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No DVIR records in 60-day window.</p>
          ) : (
            <Card>
              <CardContent className="pt-4">
                {/* Summary stats */}
                <div className="grid grid-cols-4 gap-3 mb-4 pb-4 border-b border-border">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total inspections</p>
                    <p className="text-xl font-semibold tabular-nums">{dvirRecords.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Satisfactory</p>
                    <p className="text-xl font-semibold tabular-nums text-emerald-700">
                      {dvirRecords.filter((r) => r.status === "satisfactory").length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Unsatisfactory</p>
                    <p className={`text-xl font-semibold tabular-nums ${dvirRecords.filter((r) => r.status !== "satisfactory").length > 0 ? "text-red-600" : ""}`}>
                      {dvirRecords.filter((r) => r.status !== "satisfactory").length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Open defects</p>
                    <p className={`text-xl font-semibold tabular-nums ${unresolvedCritical.length > 0 ? "text-red-600" : ""}`}>
                      {unresolvedCritical.length}
                    </p>
                  </div>
                </div>
                {/* Compact list: most recent 5, collapsible for rest */}
                <div className="space-y-1">
                  {dvirRecords.slice(0, 5).map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground font-mono text-xs tabular-nums w-24">{fmtDateShort(rec.inspectedAt)}</span>
                        <span className="capitalize text-xs text-muted-foreground">{rec.type.replace(/_/g, " ")}</span>
                        {rec.defects.length > 0 && (
                          <span className="text-xs text-muted-foreground">{rec.defects.length} defect{rec.defects.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${rec.status === "satisfactory" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"}`}
                      >
                        {rec.status === "satisfactory" ? "Pass" : "Fail"}
                      </Badge>
                    </div>
                  ))}
                </div>
                {dvirRecords.length > 5 && (
                  <Collapsible>
                    <CollapsibleTrigger className="text-xs text-primary hover:underline mt-2">
                      Show {dvirRecords.length - 5} more inspection{dvirRecords.length - 5 !== 1 ? "s" : ""} →
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-1 mt-1">
                        {dvirRecords.slice(5).map((rec) => (
                          <div key={rec.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-muted-foreground font-mono text-xs tabular-nums w-24">{fmtDateShort(rec.inspectedAt)}</span>
                              <span className="capitalize text-xs text-muted-foreground">{rec.type.replace(/_/g, " ")}</span>
                              {rec.defects.length > 0 && (
                                <span className="text-xs text-muted-foreground">{rec.defects.length} defect{rec.defects.length !== 1 ? "s" : ""}</span>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${rec.status === "satisfactory" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"}`}
                            >
                              {rec.status === "satisfactory" ? "Pass" : "Fail"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
                {/* Unresolved defect details, if any */}
                {unresolvedCritical.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-red-700 mb-1.5">Unresolved critical defects</p>
                    <ul className="space-y-0.5 text-xs">
                      {unresolvedCritical.slice(0, 10).map((d) => (
                        <li key={d.id} className="text-muted-foreground">
                          <span className="font-medium text-red-700">{d.component}</span> — {d.note || "no description"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* 6. Trip route */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Trip route</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {tripOrigin && (
              <Card>
                <CardContent className="pt-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trip origin</p>
                  </div>
                  <p className="text-sm font-semibold">
                    {tripOrigin.cityName ?? `${tripOrigin.lat.toFixed(4)}°N, ${Math.abs(tripOrigin.lng).toFixed(4)}°W`}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {tripOrigin.lat.toFixed(4)}°N, {Math.abs(tripOrigin.lng).toFixed(4)}°W
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtDate(tripOrigin.at)}</p>
                  <p className="text-xs text-muted-foreground/70">via Catena HOS events</p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="pt-4 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-red-200" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Incident location</p>
                </div>
                <p className="text-sm font-semibold">{incidentLocation}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {packet.incidentLat.toFixed(4)}°N, {Math.abs(packet.incidentLng).toFixed(4)}°W
                </p>
                <p className="text-xs text-muted-foreground">{fmtDate(incidentAt)}</p>
              </CardContent>
            </Card>
            {routeWaypoints.length > 0 && (
              <Card>
                <CardContent className="pt-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Route pings</p>
                  </div>
                  <p className="text-sm font-semibold">{routeWaypoints.length} GPS records</p>
                  <p className="text-xs text-muted-foreground">
                    Pre-incident window · {routeWaypoints.filter((w) => w.fromApi).length} from API
                  </p>
                  <p className="text-xs text-muted-foreground/70">via Catena vehicle-locations</p>
                </CardContent>
              </Card>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            Route color: teal = within limit, amber = near limit, red = over limit. Pin = incident location.
          </p>
          <ClaimMap
            routeWaypoints={routeWaypoints}
            incidentLat={packet.incidentLat}
            incidentLng={packet.incidentLng}
            postedSpeedLimitMph={postedSpeedLimitMph}
          />
        </section>

        {/* 7. External enrichment */}
        {(weatherContext || roadContext || carrierContext) && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">External data enrichment</h2>
            <div className="space-y-2">
              {weatherContext && weatherContext.source === "noaa" && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Weather — NOAA</CardTitle>
                      <Badge variant="outline" className="text-xs">api.weather.gov</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 grid gap-1 sm:grid-cols-2">
                    <Row k="Station" v={weatherContext.stationName ?? weatherContext.stationId ?? "—"} />
                    <Row k="Distance" v={weatherContext.stationDistanceKm != null ? `${weatherContext.stationDistanceKm} km` : "—"} />
                    <Row k="Conditions" v={weatherContext.conditionDescription ?? "—"} />
                    <Row k="Road condition" v={weatherContext.roadCondition} />
                    {weatherContext.temperatureF != null && <Row k="Temperature" v={`${weatherContext.temperatureF}°F`} />}
                    {weatherContext.windSpeedMph != null && <Row k="Wind" v={`${weatherContext.windSpeedMph} mph`} />}
                    {weatherContext.visibilityMiles != null && <Row k="Visibility" v={`${weatherContext.visibilityMiles} mi`} />}
                  </CardContent>
                </Card>
              )}
              {roadContext && roadContext.source === "osm" && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Road context — OpenStreetMap</CardTitle>
                      <Badge variant="outline" className="text-xs">OSM Overpass</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 grid gap-1 sm:grid-cols-2">
                    {roadContext.roadName && <Row k="Road name" v={roadContext.roadName} />}
                    <Row k="Classification" v={roadContext.roadClassification ?? "unknown"} />
                    {roadContext.postedSpeedLimitMph != null && <Row k="Posted limit" v={`${roadContext.postedSpeedLimitMph} mph`} />}
                    {roadContext.osmWayId && <Row k="OSM way ID" v={roadContext.osmWayId} />}
                  </CardContent>
                </Card>
              )}
              {carrierContext && carrierContext.source === "fmcsa" && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Carrier safety — FMCSA SAFER</CardTitle>
                      <Badge variant="outline" className="text-xs">DOT #{carrierContext.dotNumber}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 grid gap-1 sm:grid-cols-2">
                    {carrierContext.carrierName && <Row k="Carrier" v={carrierContext.carrierName} />}
                    <Row k="Safety rating" v={carrierContext.safetyRating ?? "not rated"} />
                    {carrierContext.crashTotal24m != null && <Row k="Crashes (24m)" v={String(carrierContext.crashTotal24m)} />}
                    {carrierContext.outOfServiceRateDrivers != null && (
                      <Row k="Driver OOS rate" v={`${(carrierContext.outOfServiceRateDrivers * 100).toFixed(1)}%`} />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        {/* 8. Driver safety profile */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Driver safety profile</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Safety events (30d)"
              value={driverSafetyEvents30d != null ? String(driverSafetyEvents30d) : "—"}
              danger={(driverSafetyEvents30d ?? 0) > 5}
            />
            <Metric label="HOS violations (90d)" value={String(driverHosViolations90d)} danger={driverHosViolations90d > 3} />
            <Metric label="Tenure" value={`${driverTenureMonths} months`} />
          </div>
          {driverHosViolations30d != null && (
            <p className="text-xs text-muted-foreground">
              HOS violations (30d): {driverHosViolations30d}
            </p>
          )}
        </section>

        {/* 9. Incident summary */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Incident summary</h2>
            <NarrativeCopy text={incidentSummary.replace(/\*\*/g, "")} />
          </div>
          <Card>
            <CardContent className="pt-6">
              <InlineMarkdown text={incidentSummary} />
              <p className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">
                Factual summary generated from Catena telematics data. No legal opinion is expressed or implied.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Actions footer */}
        <section className="flex flex-wrap gap-3 pb-8">
          <a
            href={`/api/pdf/claims/${claimId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition"
          >
            Export as PDF
          </a>
          <ShareCounselButton claimId={claimId} />
        </section>
      </div>

      {/* ── Right rail ───────────────────────────────────────────────────── */}
      <aside className="mt-10 space-y-4 lg:mt-0">
        <div className="lg:sticky lg:top-20 space-y-4">
          {/* Data completeness */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data completeness</CardTitle>
              <CardDescription>Evidence quality indicator</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CompletenessBadge status={dataCompleteness.status} />
              {dataCompleteness.apiFieldsPresent.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">From API</p>
                  <p className="text-xs text-muted-foreground">{dataCompleteness.apiFieldsPresent.join(", ")}</p>
                </div>
              )}
              {dataCompleteness.missingFields.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-destructive mb-1">Missing</p>
                  <p className="text-xs text-muted-foreground">{dataCompleteness.missingFields.join(", ")}</p>
                </div>
              )}
              {dataCompleteness.syntheticFields.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-600 mb-1">Synthetic</p>
                  <p className="text-xs text-muted-foreground">{dataCompleteness.syntheticFields.join(", ")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chain of custody */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chain of custody</CardTitle>
              <CardDescription>Evidence provenance ({evidenceManifest.length} sources)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row k="Telematics window" v="72 hours pre-incident" />
              <Row k="Speed samples" v={`${speedTimeline.length} points (1-min)`} />
              <Row k="API samples" v={`${speedTimeline.filter((s) => s.fromApi).length} real pings`} />
              <Row k="Route waypoints" v={`${routeWaypoints.length} points (15-min)`} />
              <Row k="DVIR records" v={`${dvirRecords.length} inspections`} />
              <Separator className="my-2" />
              {dataProvenance.slice(0, 6).map((p) => (
                <div key={p.field} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{p.field}</span>
                  <span className="font-mono text-xs">{p.source}</span>
                </div>
              ))}
              {evidenceManifest.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <p className="text-xs font-medium">SHA-256 hashes</p>
                  {evidenceManifest.map((e) => (
                    <div key={e.id} className="text-xs">
                      <p className="text-muted-foreground">{e.description}</p>
                      <p className="font-mono truncate text-muted-foreground/60">{e.sha256.slice(0, 16)}…</p>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
