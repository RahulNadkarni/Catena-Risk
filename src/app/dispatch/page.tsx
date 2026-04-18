import { fetchDispatchSnapshot } from "@/app/actions/dispatch";
import { AppShell } from "@/components/layout/app-shell";
import { DriverBoard } from "@/components/dispatch/driver-board";
import { SafetyFeed } from "@/components/dispatch/safety-feed";
import { Badge } from "@/components/ui/badge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function KpiTile({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums mt-0.5 ${color ?? ""}`}>{value}</p>
    </div>
  );
}

export default async function DispatchPage() {
  const snap = await fetchDispatchSnapshot();

  const ts = new Date(snap.fetchedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Fleet dispatch</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Live HOS status and safety alerts — pulled directly from Catena API. Click any driver to see location, road conditions, and file an incident report.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">
              Live · Catena API
            </Badge>
            <span className="text-xs text-muted-foreground">as of {ts}</span>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <KpiTile label="Total drivers" value={snap.totalDrivers} />
          <KpiTile label="Driving" value={snap.driving} color="text-blue-700" />
          <KpiTile label="On duty" value={snap.onDuty} color="text-amber-700" />
          <KpiTile label="Off duty" value={snap.offDuty} />
          <KpiTile label="Near limit" value={snap.nearLimit} color={snap.nearLimit > 0 ? "text-amber-600" : ""} />
          <KpiTile label="In violation" value={snap.inViolation} color={snap.inViolation > 0 ? "text-red-600" : ""} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Driver HOS board — client component for filter/sort toggle */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Driver HOS status</h2>
              <span className="text-xs text-muted-foreground">
                near-limit first · click to view location &amp; file report
              </span>
            </div>
            <DriverBoard drivers={snap.driverStatuses} />
          </div>

          {/* Safety events feed */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Safety events (24h)</h2>
              <span className="text-xs text-muted-foreground">({snap.recentSafetyEvents.length} events)</span>
            </div>
            <SafetyFeed events={snap.recentSafetyEvents} />

            {snap.activeViolations > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-700">
                  {snap.activeViolations} active HOS violation{snap.activeViolations > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Drivers with violations in the last 24 hours require immediate review.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Data sources</p>
              <p>Live locations → <code>GET /v2/telematics/analytics/vehicles/live-locations</code></p>
              <p>HOS status → <code>GET /v2/telematics/hos-availabilities</code></p>
              <p>Driver roster → <code>GET /v2/telematics/users</code></p>
              <p>Safety events → <code>GET /v2/telematics/driver-safety-events</code></p>
              <p>Violations → <code>GET /v2/telematics/hos-violations</code></p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
