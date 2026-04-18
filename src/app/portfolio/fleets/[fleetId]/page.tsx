import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Truck, Users, AlertTriangle, Activity, BarChart2, Container } from "lucide-react";
import { format } from "date-fns";
import { fetchFleetDetail } from "@/lib/catena/fleet-detail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

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

function dutyColor(code: string): string {
  if (code === "D") return "bg-blue-100 text-blue-700";
  if (code === "ON") return "bg-amber-100 text-amber-700";
  if (code === "SB") return "bg-indigo-100 text-indigo-700";
  if (code === "OFF") return "bg-gray-100 text-gray-600";
  if (code === "PC") return "bg-purple-100 text-purple-700";
  if (code === "YM") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-500";
}

export default async function FleetDetailPage({ params }: { params: { fleetId: string } }) {
  const { fleetId } = params;
  const fleet = await fetchFleetDetail(decodeURIComponent(fleetId));
  if (!fleet) notFound();

  const totalHos = Object.values(fleet.dutyStatusCounts).reduce((s, n) => s + n, 0);
  const eventsTotal = fleet.eventBreakdown.reduce((s, e) => s + e.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portfolio" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to portfolio
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{fleet.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {fleet.fleetRef && <span className="font-mono mr-2">{fleet.fleetRef}</span>}
              <span className="font-mono text-xs">{fleet.fleetId}</span>
            </p>
          </div>
          <Link
            href={`/underwriting/new?fleet=${encodeURIComponent(fleet.fleetId)}`}
            className={buttonVariants()}
          >
            New underwriting run
          </Link>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{fleet.vehicleCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Container className="h-4 w-4 text-muted-foreground" />
              Trailers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {fleet.trailerCount ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{fleet.driverCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{fleet.activeDrivers} currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Events (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{fleet.safetyEvents30d}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              HOS violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold tabular-nums ${fleet.hosViolations30d > 0 ? "text-red-600" : ""}`}>
              {fleet.hosViolations30d}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
              Events/veh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {fleet.vehicleCount > 0 ? (fleet.safetyEvents30d / fleet.vehicleCount).toFixed(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">per month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Duty status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current duty status mix</CardTitle>
            <CardDescription>From <code className="text-xs">listHosAvailabilities</code> · {totalHos} drivers</CardDescription>
          </CardHeader>
          <CardContent>
            {totalHos === 0 ? (
              <p className="text-sm text-muted-foreground">No HOS availability records.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(fleet.dutyStatusCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([code, count]) => {
                    const pct = ((count / totalHos) * 100).toFixed(0);
                    return (
                      <div key={code} className="space-y-0.5">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${dutyColor(code)}`}>{code}</Badge>
                            <span className="text-muted-foreground">
                              {code === "D" ? "Driving" : code === "ON" ? "On duty" : code === "SB" ? "Sleeper" : code === "OFF" ? "Off duty" : code === "PC" ? "Personal conveyance" : code === "YM" ? "Yard moves" : code}
                            </span>
                          </div>
                          <span className="tabular-nums text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${dutyColor(code).split(" ")[0]}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Safety event mix (30d)</CardTitle>
            <CardDescription>{eventsTotal} total events</CardDescription>
          </CardHeader>
          <CardContent>
            {eventsTotal === 0 ? (
              <p className="text-sm text-muted-foreground">No safety events recorded in the last 30 days.</p>
            ) : (
              <div className="space-y-1.5">
                {fleet.eventBreakdown.map((e) => {
                  const pct = ((e.count / eventsTotal) * 100).toFixed(0);
                  return (
                    <div key={e.type} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className={`text-xs ${eventBadgeColor(e.type)}`}>{e.type}</Badge>
                      </div>
                      <span className="tabular-nums text-muted-foreground">{e.count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent events list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent safety events</CardTitle>
          <CardDescription>Latest 15 events for this fleet</CardDescription>
        </CardHeader>
        <CardContent>
          {fleet.recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No safety events.</p>
          ) : (
            <div className="space-y-1">
              {fleet.recentEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3 text-sm min-w-0">
                    <Badge variant="outline" className={`text-xs shrink-0 ${eventBadgeColor(e.eventType)}`}>{e.eventType}</Badge>
                    <Link
                      href={`/portfolio/drivers/${encodeURIComponent(e.driverId)}`}
                      className="min-w-0 truncate hover:underline"
                    >
                      <span className="text-sm font-medium text-primary">
                        {e.driverName ?? "Unnamed driver"}
                      </span>
                      {e.driverId && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground/60 font-mono tabular-nums">
                          {e.driverId.slice(0, 8)}
                        </span>
                      )}
                    </Link>
                    {e.durationSeconds != null && <span className="text-xs text-muted-foreground">{e.durationSeconds}s</span>}
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
        Data sources · vehicles <code>listVehicles</code> · drivers &amp; duty status <code>listHosAvailabilities</code> · events <code>listDriverSafetyEvents</code> · violations <code>listHosViolations</code>. All live from Catena Clearing API.
      </p>
    </div>
  );
}
