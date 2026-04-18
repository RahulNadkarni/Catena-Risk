import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Shield, FileWarning, IdCard } from "lucide-react";
import { format } from "date-fns";
import { fetchDriverProfile } from "@/lib/catena/fleet-detail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function eventBadgeColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("speed")) return "bg-red-100 text-red-700 border-red-200";
  if (t.includes("accel")) return "bg-orange-100 text-orange-700 border-orange-200";
  if (t.includes("brake") || t.includes("braking")) return "bg-orange-100 text-orange-700 border-orange-200";
  if (t.includes("turn") || t.includes("corner")) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (t.includes("seat") || t.includes("belt")) return "bg-blue-100 text-blue-700 border-blue-200";
  if (t.includes("distract") || t.includes("phone")) return "bg-purple-100 text-purple-700 border-purple-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

export default async function DriverProfilePage({ params }: { params: { driverId: string } }) {
  const { driverId } = params;
  const driver = await fetchDriverProfile(decodeURIComponent(driverId));
  if (!driver) notFound();

  const eventsTotal = driver.eventBreakdown.reduce((s, e) => s + e.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portfolio" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to portfolio
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{driver.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {driver.username && <span className="font-mono">{driver.username}</span>}
              <span className="font-mono text-xs">· {driver.driverId.slice(0, 8)}</span>
              {driver.status && (
                <Badge variant="outline" className={`text-xs ${driver.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}`}>
                  {driver.status}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Safety events (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{driver.safetyEvents30d}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-muted-foreground" />
              HOS violations (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold tabular-nums ${driver.hosViolations30d > 0 ? "text-red-600" : ""}`}>
              {driver.hosViolations30d}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              HOS ruleset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium font-mono leading-tight">
              {driver.rulesetCode ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IdCard className="h-4 w-4 text-muted-foreground" />
              License country
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{driver.licenseCountry ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event type breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event type distribution</CardTitle>
            <CardDescription>{eventsTotal} event{eventsTotal !== 1 ? "s" : ""} on record</CardDescription>
          </CardHeader>
          <CardContent>
            {eventsTotal === 0 ? (
              <p className="text-sm text-muted-foreground">No safety events recorded.</p>
            ) : (
              <div className="space-y-1.5">
                {driver.eventBreakdown.map((e) => {
                  const pct = ((e.count / eventsTotal) * 100).toFixed(0);
                  return (
                    <div key={e.type} className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className={`text-xs ${eventBadgeColor(e.type)}`}>{e.type}</Badge>
                      <span className="tabular-nums text-muted-foreground">{e.count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent violations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent HOS violations</CardTitle>
            <CardDescription>From <code className="text-xs">listHosViolations</code></CardDescription>
          </CardHeader>
          <CardContent>
            {driver.violationsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No HOS violations on record.</p>
            ) : (
              <div className="space-y-1">
                {driver.violationsList.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
                    <span className="font-mono text-xs">{v.code ?? "VIOLATION"}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {format(new Date(v.occurredAt), "MMM d, HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent events list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All safety events</CardTitle>
          <CardDescription>
            Last {driver.eventsList.length} events · from <code className="text-xs">listDriverSafetyEvents</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {driver.eventsList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No safety events on record.</p>
          ) : (
            <div className="space-y-1">
              {driver.eventsList.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3 text-sm min-w-0">
                    <Badge variant="outline" className={`text-xs shrink-0 ${eventBadgeColor(e.eventType)}`}>{e.eventType}</Badge>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">veh {e.vehicleId.slice(0, 8)}</span>
                    {e.durationSeconds != null && (
                      <span className="text-xs text-muted-foreground">
                        {e.eventType.includes("speed") ? `${e.durationSeconds}s over limit` : `${e.durationSeconds}s`}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {format(new Date(e.occurredAt), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground pb-4">
        Data sources · driver summary <code>listDriverSummaries</code> · events <code>listDriverSafetyEvents</code> · violations <code>listHosViolations</code>. All live from Catena Clearing API. Speeding mph not exposed by TSP — duration in seconds is reported.
      </p>
    </div>
  );
}
