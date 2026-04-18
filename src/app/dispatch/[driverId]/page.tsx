import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, AlertTriangle, Clock, Shield, Truck, Activity, BarChart2, Navigation } from "lucide-react";
import { fetchDriverDetail } from "@/app/actions/dispatch";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DriverMap } from "@/components/dispatch/driver-map";
import type { HosEventItem } from "@/app/actions/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function HoursBar({ label, avail, limit, warn }: { label: string; avail: number | null; limit: number; warn: number }) {
  if (avail == null) return null;
  const used = Math.max(0, limit - avail);
  const pct = Math.min(100, (used / limit) * 100);
  const isWarn = avail <= warn;
  const isOver = avail <= 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={isOver ? "text-red-600 font-semibold" : isWarn ? "text-amber-600 font-semibold" : ""}>
          {avail <= 0 ? "Over limit" : `${avail.toFixed(1)}h left`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DurationBar({ label, seconds, totalSeconds }: { label: string; seconds: number; totalSeconds: number }) {
  const pct = totalSeconds > 0 ? Math.min(100, (seconds / totalSeconds) * 100) : 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{h}h {m}m</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZoneName: "short",
  });
}

function eventBadgeColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("speed")) return "bg-red-100 text-red-700 border-red-200";
  if (t.includes("brake") || t.includes("braking")) return "bg-orange-100 text-orange-700 border-orange-200";
  if (t.includes("corner") || t.includes("turn")) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (t.includes("seatbelt") || t.includes("belt")) return "bg-blue-100 text-blue-700 border-blue-200";
  if (t.includes("distract") || t.includes("phone")) return "bg-purple-100 text-purple-700 border-purple-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function hosEventColor(code: string): string {
  const c = code.toUpperCase();
  if (c === "D" || c === "DRIVING") return "bg-blue-100 text-blue-700 border-blue-200";
  if (c === "ON") return "bg-amber-100 text-amber-700 border-amber-200";
  if (c === "SB") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  if (c === "OFF") return "bg-gray-100 text-gray-500 border-gray-200";
  if (c === "PC") return "bg-purple-100 text-purple-700 border-purple-200";
  if (c === "YM") return "bg-green-100 text-green-700 border-green-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s === "driving") return "bg-blue-100 text-blue-800 border-blue-200";
  if (s.startsWith("on duty") || s === "yard moves") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "sleeper") return "bg-indigo-100 text-indigo-800 border-indigo-200";
  if (s === "personal conveyance") return "bg-purple-100 text-purple-800 border-purple-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

// HARDCODED string-replace for demo — the canonical source is
// `/v2/telematics/ref-hos-rulesets` (cached fixture at
// src/lib/fixtures/reference/ref_hos_rulesets.json). Production would look up
// `short_name` / `description` from that reference table instead of the
// hand-rolled string massage below.
function formatRuleset(code: string | null): string {
  if (!code) return "—";
  return code.replace(/_/g, " ").replace("US INT PROP", "US Interstate").replace("SLPVAR", "(sleeper split)");
}

export default async function DriverDetailPage({
  params,
}: {
  params: { driverId: string };
}) {
  const { driverId } = params;
  const detail = await fetchDriverDetail(decodeURIComponent(driverId));
  if (!detail) notFound();

  const {
    driver,
    allEventsForDriver,
    weather,
    roadContext,
    currentCity,
    hosEvents,
    todaySnapshot,
    driverSummary,
    vehicle,
    dvirLogs,
    hosViolationsList,
    gpsTrail,
    tripOriginFromTrail,
    trailDistanceMi,
    engineEvents,
    vehicleSummary,
    iftaSummary,
    sensorEvents,
  } = detail;

  // Generate demo claim number: DISP-{first6ofDriverId}-{date}
  const today = new Date();
  const datePart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const demoClaim = `DISP-${driver.driverId.slice(0, 6).toUpperCase()}-${datePart}`;

  const hasLocation = driver.lat != null && driver.lng != null;

  // Today's snapshot total seconds for bar proportions
  const snapTotal = todaySnapshot
    ? todaySnapshot.drivingSeconds + todaySnapshot.onDutySeconds + todaySnapshot.offDutySeconds + todaySnapshot.sleeperSeconds
    : 86400;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/dispatch"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dispatch
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{driver.driverName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs ${statusColor(driver.dutyStatus)}`}>
                  {driver.dutyStatus}
                </Badge>
                {driver.vehicleUnit && (
                  <span className="text-sm text-muted-foreground">Vehicle {driver.vehicleUnit}</span>
                )}
                {driver.isInViolation && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">HOS Violation</span>
                )}
                {!driver.isInViolation && driver.isNearLimit && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Near limit</span>
                )}
              </div>
            </div>
            <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs shrink-0">
              Live · Catena API
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="space-y-4">
            {/* Map */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Current location {currentCity && <span className="text-sm font-normal text-muted-foreground">· {currentCity}</span>}
                </CardTitle>
                {hasLocation && (
                  <CardDescription className="font-mono">
                    {driver.lat!.toFixed(5)}°N, {Math.abs(driver.lng!).toFixed(5)}°W
                    {driver.lastLocationAt && ` · updated ${relTime(driver.lastLocationAt)}`}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-0 overflow-hidden rounded-b-xl">
                {hasLocation ? (
                  <div style={{ height: 320 }}>
                    <DriverMap lat={driver.lat!} lng={driver.lng!} driverName={driver.driverName} />
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-sm text-muted-foreground bg-muted/30">
                    No live location data available from Catena API
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trip origin → destination */}
            {(driver.tripOrigin || driver.lastDrivingPoint || tripOriginFromTrail) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                    Trip route
                  </CardTitle>
                  <CardDescription>
                    GPS trail + HOS duty-status changes via <code className="text-xs">listVehicleLocations</code> / <code className="text-xs">listHosEvents</code>
                    {trailDistanceMi != null && ` · ${trailDistanceMi.toLocaleString()} mi from origin`}
                    {gpsTrail.length > 0 && ` · ${gpsTrail.length} GPS points (24h)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tripOriginFromTrail && (
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-teal-500 shrink-0 ring-2 ring-teal-200" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trail origin (24h GPS)</p>
                          <p className="text-sm font-semibold">
                            {tripOriginFromTrail.cityName ?? "Reverse geocode unavailable"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {tripOriginFromTrail.lat.toFixed(4)}°N, {Math.abs(tripOriginFromTrail.lng).toFixed(4)}°W
                          </p>
                          <p className="text-xs text-muted-foreground">{fmtTime(tripOriginFromTrail.at)}</p>
                        </div>
                      </div>
                    )}
                    {driver.tripOrigin && (
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-200" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trip origin</p>
                          <p className="text-sm font-semibold">
                            {driver.tripOrigin.cityName ?? "Reverse geocode unavailable"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {driver.tripOrigin.lat.toFixed(4)}°N, {Math.abs(driver.tripOrigin.lng).toFixed(4)}°W
                          </p>
                          <p className="text-xs text-muted-foreground">{fmtTime(driver.tripOrigin.at)}</p>
                        </div>
                      </div>
                    )}
                    {driver.lastDrivingPoint && (
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0 ring-2 ring-blue-200" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last driving position</p>
                          <p className="text-sm font-semibold">
                            {driver.lastDrivingPoint.cityName ?? "Reverse geocode unavailable"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {driver.lastDrivingPoint.lat.toFixed(4)}°N, {Math.abs(driver.lastDrivingPoint.lng).toFixed(4)}°W
                          </p>
                          <p className="text-xs text-muted-foreground">{fmtTime(driver.lastDrivingPoint.at)}</p>
                        </div>
                      </div>
                    )}
                    {hasLocation && (
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-orange-400 shrink-0 ring-2 ring-orange-100" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live GPS ping</p>
                          <p className="text-sm font-semibold">{currentCity ?? "Reverse geocode unavailable"}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {driver.lat!.toFixed(4)}°N, {Math.abs(driver.lng!).toFixed(4)}°W
                          </p>
                          {driver.lastLocationAt && <p className="text-xs text-muted-foreground">{relTime(driver.lastLocationAt)}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vehicle card — full details */}
            {(driver.vehicleName || vehicle || driver.odometerMi != null || driver.engineHours != null || driver.fuelPct != null) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    Vehicle
                  </CardTitle>
                  {(driver.vehicleName || (vehicle?.make && vehicle.model)) && (
                    <CardDescription>
                      {vehicle?.year && `${vehicle.year} `}{vehicle?.make && vehicle?.model ? `${vehicle.make} ${vehicle.model}` : driver.vehicleName}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Vehicle record identifiers */}
                  {vehicle && (vehicle.vin || vehicle.licensePlate) && (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm pb-3 border-b border-border/50">
                      {vehicle.vin && (
                        <div>
                          <p className="text-xs text-muted-foreground">VIN</p>
                          <p className="font-medium font-mono text-xs">{vehicle.vin}</p>
                        </div>
                      )}
                      {vehicle.licensePlate && (
                        <div>
                          <p className="text-xs text-muted-foreground">License plate</p>
                          <p className="font-medium font-mono">
                            {vehicle.licensePlate}
                            {vehicle.licenseRegion && <span className="text-muted-foreground ml-1">· {vehicle.licenseRegion}</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Live telemetry */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {driver.speedMph != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Speed (live)</p>
                        <p className="font-medium">{driver.speedMph.toFixed(1)} mph</p>
                      </div>
                    )}
                    {driver.odometerMi != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Odometer</p>
                        <p className="font-medium">{driver.odometerMi.toLocaleString()} mi</p>
                      </div>
                    )}
                    {driver.engineHours != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Engine hours</p>
                        <p className="font-medium">{Math.round(driver.engineHours).toLocaleString()} h</p>
                      </div>
                    )}
                    {driver.fuelPct != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Fuel level</p>
                        <p className="font-medium">{driver.fuelPct.toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    via <code>listVehicles</code> + <code>live-locations</code>
                    {driver.speedMph != null && driver.speedMph < 2 && (
                      <span className="block mt-1 text-amber-700">
                        Demo disclaimer: this sandbox simulator holds vehicles stationary (speed ≈ 0) in Woodstock, IL.
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Vehicle performance (30d) — from listVehicleSummaries */}
            {vehicleSummary && (
              vehicleSummary.safetyEvents30d != null ||
              vehicleSummary.hosViolations30d != null ||
              vehicleSummary.distanceMi30d != null ||
              vehicleSummary.driveHours30d != null ||
              vehicleSummary.fuelGallons30d != null
            ) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    Vehicle performance (30d)
                  </CardTitle>
                  <CardDescription>via <code className="text-xs">listVehicleSummaries</code></CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-3 text-sm">
                    {vehicleSummary.distanceMi30d != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Distance</p>
                        <p className="font-medium tabular-nums">{vehicleSummary.distanceMi30d.toLocaleString()} mi</p>
                      </div>
                    )}
                    {vehicleSummary.driveHours30d != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Drive time</p>
                        <p className="font-medium tabular-nums">{vehicleSummary.driveHours30d.toLocaleString()} h</p>
                      </div>
                    )}
                    {vehicleSummary.fuelGallons30d != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Fuel</p>
                        <p className="font-medium tabular-nums">{vehicleSummary.fuelGallons30d.toLocaleString()} gal</p>
                      </div>
                    )}
                    {vehicleSummary.safetyEvents30d != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Safety events</p>
                        <p className="font-medium tabular-nums">{vehicleSummary.safetyEvents30d.toLocaleString()}</p>
                      </div>
                    )}
                    {vehicleSummary.hosViolations30d != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">HOS violations</p>
                        <p className={`font-medium tabular-nums ${vehicleSummary.hosViolations30d > 0 ? "text-red-600" : ""}`}>
                          {vehicleSummary.hosViolations30d.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Road + weather context */}
            {(roadContext || weather) && (
              <div className="grid grid-cols-2 gap-3">
                {roadContext && (
                  <Card>
                    <CardContent className="pt-4 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Road conditions</p>
                      <p className="text-sm font-medium">{roadContext.roadName ?? "Unknown road"}</p>
                      <p className="text-xs text-muted-foreground">{roadContext.classification ?? "—"}</p>
                      {roadContext.speedLimitMph != null && (
                        <p className="text-xs text-muted-foreground">
                          Posted limit: <span className="font-semibold text-foreground">{roadContext.speedLimitMph} mph</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">via OpenStreetMap</p>
                    </CardContent>
                  </Card>
                )}
                {weather && (
                  <Card>
                    <CardContent className="pt-4 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Weather</p>
                      {weather.tempF != null ? (
                        <p className="text-sm font-medium">{Math.round(weather.tempF)}°F</p>
                      ) : (
                        <p className="text-sm font-medium text-muted-foreground">Temp unavailable</p>
                      )}
                      <p className="text-xs text-muted-foreground">{weather.condition}</p>
                      {weather.windMph != null && (
                        <p className="text-xs text-muted-foreground">Wind: {weather.windMph.toFixed(0)} mph</p>
                      )}
                      {weather.visibilityMi != null && (
                        <p className="text-xs text-muted-foreground">Visibility: {weather.visibilityMi} mi</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">via NOAA</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* HOS trip timeline */}
            {hosEvents.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Duty status timeline
                  </CardTitle>
                  <CardDescription>
                    {hosEvents.length} ELD record{hosEvents.length !== 1 ? "s" : ""} · newest first · via Catena HOS events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {hosEvents.map((evt: HosEventItem) => (
                      <div key={evt.id} className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
                        <div className="flex items-start gap-2 min-w-0">
                          <Badge variant="outline" className={`text-xs shrink-0 ${hosEventColor(evt.dutyStatusCode)}`}>
                            {evt.dutyStatusLabel}
                          </Badge>
                          <div className="min-w-0">
                            {evt.locationName && (
                              <p className="text-xs text-muted-foreground truncate">{evt.locationName}</p>
                            )}
                            {evt.lat != null && (
                              <p className="text-xs text-muted-foreground">
                                {evt.lat.toFixed(4)}°, {evt.lng != null ? evt.lng.toFixed(4) : "—"}°
                              </p>
                            )}
                            {evt.rulesetCode && (
                              <p className="text-xs text-muted-foreground/60">{formatRuleset(evt.rulesetCode)}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">{fmtTime(evt.startedAt)}</p>
                          {evt.odometer != null && (
                            <p className="text-xs text-muted-foreground/60">{Math.round(evt.odometer / 1609.344).toLocaleString()} mi</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* HOS violations — driver-specific */}
            {hosViolationsList.length > 0 && (
              <Card className="border-red-200 bg-red-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-red-900">
                    <AlertTriangle className="h-4 w-4" />
                    HOS violations (30d)
                  </CardTitle>
                  <CardDescription>
                    {hosViolationsList.length} violation{hosViolationsList.length !== 1 ? "s" : ""} · via <code className="text-xs">listHosViolations</code>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {hosViolationsList.map((v) => (
                      <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-red-200/40 last:border-0 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-xs shrink-0 bg-red-100 text-red-700 border-red-200">
                            {v.code ?? "VIOLATION"}
                          </Badge>
                          {v.durationSeconds != null && (
                            <span className="text-xs text-muted-foreground">{v.durationSeconds}s</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{fmtTime(v.occurredAt)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* DVIR inspection history */}
            {dvirLogs.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    DVIR inspection history
                  </CardTitle>
                  <CardDescription>
                    {dvirLogs.length} inspection{dvirLogs.length !== 1 ? "s" : ""} in 60 days ·
                    {" "}{dvirLogs.filter((l) => l.status === "satisfactory").length} satisfactory,
                    {" "}<span className={dvirLogs.filter((l) => l.status === "unsatisfactory").length > 0 ? "text-red-600 font-semibold" : ""}>{dvirLogs.filter((l) => l.status === "unsatisfactory").length} unsatisfactory</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {dvirLogs.slice(0, 10).map((l) => (
                      <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs text-muted-foreground font-mono tabular-nums w-24">{fmtTime(l.inspectedAt)}</span>
                          <span className="text-xs capitalize">{l.type}</span>
                          {l.defectCount > 0 && (
                            <span className="text-xs text-red-700">{l.defectCount} defect{l.defectCount !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${l.status === "satisfactory" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                        >
                          {l.status === "satisfactory" ? "Pass" : "Fail"}
                        </Badge>
                      </div>
                    ))}
                    {dvirLogs.length > 10 && (
                      <p className="text-xs text-muted-foreground pt-1">+{dvirLogs.length - 10} more inspections</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Safety event history */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Safety event history
                </CardTitle>
                <CardDescription>
                  {allEventsForDriver.length} events in the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allEventsForDriver.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No safety events recorded in the last 30 days.</p>
                ) : (
                  <div className="space-y-2">
                    {allEventsForDriver.slice(0, 15).map((evt) => (
                      <div key={evt.id} className="flex items-start justify-between gap-3 py-1.5">
                        <div className="flex items-start gap-2 min-w-0">
                          <Badge variant="outline" className={`text-xs shrink-0 ${eventBadgeColor(evt.eventType)}`}>
                            {evt.eventType}
                          </Badge>
                          <div className="min-w-0">
                            {evt.location && (
                              <p className="text-xs text-muted-foreground truncate">{evt.location}</p>
                            )}
                            {evt.durationSeconds != null && (
                              <p className="text-xs text-muted-foreground/70">
                                {evt.eventType.includes("speed") ? `Duration: ${evt.durationSeconds}s · mph not reported by TSP` : `${evt.durationSeconds}s`}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{relTime(evt.occurredAt)}</span>
                      </div>
                    ))}
                    {allEventsForDriver.length > 15 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        +{allEventsForDriver.length - 15} more events
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Engine activity — from listEngineLogs (24h) */}
            {engineEvents.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Engine activity (24h)
                  </CardTitle>
                  <CardDescription>
                    {engineEvents.length} engine event{engineEvents.length !== 1 ? "s" : ""} · via <code className="text-xs">listEngineLogs</code>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {engineEvents.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className="text-xs shrink-0 capitalize">{e.eventType}</Badge>
                          {e.locationName && (
                            <span className="text-xs text-muted-foreground truncate">{e.locationName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {e.odometerMi != null && (
                            <span className="text-xs text-muted-foreground/70 tabular-nums">{e.odometerMi.toLocaleString()} mi</span>
                          )}
                          <span className="text-xs text-muted-foreground tabular-nums">{fmtTime(e.occurredAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sensor anomalies — from listVehicleSensorEvents */}
            {sensorEvents.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    Sensor events
                  </CardTitle>
                  <CardDescription>
                    {sensorEvents.length} sensor anomal{sensorEvents.length !== 1 ? "ies" : "y"} · via <code className="text-xs">listVehicleSensorEvents</code>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {sensorEvents.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className="text-xs shrink-0 capitalize">{e.eventType}</Badge>
                          {e.severity && <span className="text-xs text-muted-foreground">{e.severity}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{fmtTime(e.occurredAt)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* IFTA by jurisdiction */}
            {iftaSummary.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Mileage by jurisdiction (IFTA)
                  </CardTitle>
                  <CardDescription>via <code className="text-xs">listIftaSummaries</code></CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {iftaSummary.map((r, idx) => (
                      <div key={`${r.jurisdiction}-${idx}`} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 text-sm">
                        <span className="font-medium">{r.jurisdiction}</span>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
                          {r.distanceMi != null && <span>{r.distanceMi.toLocaleString()} mi</span>}
                          {r.fuelGallons != null && <span>{r.fuelGallons.toLocaleString()} gal</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* HOS availability */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Hours of service
                </CardTitle>
                <CardDescription>Real-time availability from Catena ELD records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <HoursBar label="Drive time" avail={driver.driveAvailH} limit={11} warn={1.5} />
                <HoursBar label="70-hr cycle" avail={driver.cycleAvailH} limit={70} warn={2} />
                {driver.shiftAvailH != null && (
                  <HoursBar label="14-hr shift" avail={driver.shiftAvailH} limit={14} warn={1} />
                )}
                {driver.hoursUntilBreak != null && driver.hoursUntilBreak < 3 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    Break required in {driver.hoursUntilBreak.toFixed(1)}h
                  </p>
                )}
                <Separator />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Drive limit: 11 hours</p>
                  <p>Cycle limit: 70 hours / 8 days</p>
                  <p>Shift limit: 14 hours on-duty window</p>
                </div>
              </CardContent>
            </Card>

            {/* Daily snapshot */}
            {todaySnapshot && (todaySnapshot.drivingSeconds > 0 || todaySnapshot.onDutySeconds > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-sm">
                    Daily log · {todaySnapshot.snapshotDate}
                  </CardTitle>
                  <CardDescription>ELD-certified hours from Catena HOS snapshots</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DurationBar label="Driving" seconds={todaySnapshot.drivingSeconds} totalSeconds={snapTotal} />
                  <DurationBar label="On duty (not driving)" seconds={todaySnapshot.onDutySeconds} totalSeconds={snapTotal} />
                  {todaySnapshot.sleeperSeconds > 0 && (
                    <DurationBar label="Sleeper berth" seconds={todaySnapshot.sleeperSeconds} totalSeconds={snapTotal} />
                  )}
                  <DurationBar label="Off duty" seconds={todaySnapshot.offDutySeconds} totalSeconds={snapTotal} />
                </CardContent>
              </Card>
            )}

            {/* 30-day driver profile */}
            {driverSummary && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    30-day driver profile
                  </CardTitle>
                  <CardDescription>Analytics from Catena driver summaries endpoint</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/40 px-3 py-2 text-center">
                      <p className="text-2xl font-semibold tabular-nums">{driverSummary.safetyEvents30d}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Safety events</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2 text-center">
                      <p className={`text-2xl font-semibold tabular-nums ${driverSummary.hosViolations30d > 0 ? "text-red-600" : ""}`}>
                        {driverSummary.hosViolations30d}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">HOS violations</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-xs">
                    {driverSummary.rulesetCode && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">HOS ruleset</span>
                        <span className="font-medium text-right max-w-[55%]">{formatRuleset(driverSummary.rulesetCode)}</span>
                      </div>
                    )}
                    {driverSummary.licenseCountry && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">License country</span>
                        <span className="font-medium">{driverSummary.licenseCountry}</span>
                      </div>
                    )}
                    {driverSummary.username && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Username</span>
                        <span className="font-medium font-mono">{driverSummary.username}</span>
                      </div>
                    )}
                    {driverSummary.status && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account status</span>
                        <span className={`font-medium ${driverSummary.status === "ACTIVE" ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {driverSummary.status}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Simulate incident */}
            <Card className="border-orange-200 bg-orange-50/40">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <CardTitle className="text-base text-orange-900">Simulate incident</CardTitle>
                </div>
                <CardDescription>
                  Demo — create a full telematics evidence report using this driver&apos;s real Catena data: ELD records, HOS snapshot, DVIR logs, NOAA weather, and OSM road context.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border border-orange-200 bg-white px-3 py-2 text-xs space-y-1">
                  <p className="font-medium text-orange-900">Auto-generated claim number</p>
                  <p className="font-mono text-sm text-foreground">{demoClaim}</p>
                  <p className="text-muted-foreground">Driver: {driver.driverName}</p>
                  {driver.vehicleUnit && <p className="text-muted-foreground">Vehicle: {driver.vehicleUnit}</p>}
                  {hasLocation && (
                    <p className="text-muted-foreground">
                      Location: {driver.lat!.toFixed(4)}°N, {Math.abs(driver.lng!).toFixed(4)}°W
                    </p>
                  )}
                </div>

                <Link
                  href={`/claims/new?claimNumber=${encodeURIComponent(demoClaim)}&driverId=${encodeURIComponent(driver.driverId)}`}
                  className="flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
                >
                  Create incident report →
                </Link>

                <p className="text-xs text-muted-foreground">
                  Catena API will be queried live. HOS compliance, safety events, and vehicle data are pulled fresh at report creation time.
                </p>
              </CardContent>
            </Card>

            {/* Data sources */}
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Data sources — this page</p>
              <p>Live location → <code>/v2/telematics/analytics/vehicles/live-locations</code></p>
              <p>Vehicle record → <code>/v2/telematics/vehicles</code></p>
              <p>HOS availability → <code>/v2/telematics/hos-availabilities</code></p>
              <p>HOS events (timeline) → <code>/v2/telematics/hos-events</code></p>
              <p>HOS daily log → <code>/v2/telematics/hos-daily-snapshots</code></p>
              <p>HOS violations → <code>/v2/telematics/hos-violations</code></p>
              <p>DVIR inspections → <code>/v2/telematics/dvir-logs</code></p>
              <p>Safety events → <code>/v2/telematics/driver-safety-events</code></p>
              <p>30-day profile → <code>/v2/telematics/analytics/drivers</code></p>
              <p>Road context → OpenStreetMap Overpass</p>
              <p>Reverse geocoding → OpenStreetMap Nominatim</p>
              <p>Weather → NOAA api.weather.gov</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
