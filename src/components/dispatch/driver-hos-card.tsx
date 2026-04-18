import type { DriverHosStatus } from "@/app/actions/dispatch";
import { Badge } from "@/components/ui/badge";

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s === "driving") return "bg-blue-100 text-blue-800 border-blue-200";
  if (s.startsWith("on duty") || s === "yard moves") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "sleeper") return "bg-indigo-100 text-indigo-800 border-indigo-200";
  if (s === "personal conveyance") return "bg-purple-100 text-purple-800 border-purple-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

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

export function DriverHosCard({ driver }: { driver: DriverHosStatus }) {
  const borderColor = driver.isInViolation
    ? "border-red-300 bg-red-50/50"
    : driver.isNearLimit
      ? "border-amber-300 bg-amber-50/50"
      : "border-border bg-card";

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${borderColor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{driver.driverName}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <Badge
              variant="outline"
              className={`text-xs font-normal ${statusColor(driver.dutyStatus)}`}
            >
              {driver.dutyStatus}
            </Badge>
            {driver.vehicleName && (
              <span className="text-xs text-muted-foreground truncate">{driver.vehicleName}</span>
            )}
          </div>
        </div>
        {driver.isInViolation && (
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            Violation
          </span>
        )}
        {!driver.isInViolation && driver.isNearLimit && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Near limit
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {/* HOS limits (11h / 70h / 14h) are US FMCSA 49 CFR §395 constants — not
            API-sourced. Per-ruleset values (Canadian, oilfield, etc.) are
            available via /v2/telematics/ref-hos-rulesets; for this demo we
            hardcode the US interstate property-carrying defaults. Warn
            thresholds (1.5h/2h/1h remaining) are internal dispatch policy —
            HARDCODED here, would come from an internal dispatch-config API. */}
        <HoursBar label="Drive time" avail={driver.driveAvailH} limit={11} warn={1.5} />
        <HoursBar label="70-hr cycle" avail={driver.cycleAvailH} limit={70} warn={2} />
        {driver.shiftAvailH != null && (
          <HoursBar label="14-hr shift" avail={driver.shiftAvailH} limit={14} warn={1} />
        )}
        {driver.hoursUntilBreak != null && driver.hoursUntilBreak < 3 && (
          <p className="text-xs text-muted-foreground">Break required in {driver.hoursUntilBreak.toFixed(1)}h</p>
        )}
      </div>
      {(driver.tripOrigin || driver.currentCity || driver.lat != null) && (
        <div className="border-t border-border/50 pt-2 space-y-1">
          {driver.tripOrigin && (
            <TripRow
              label="From"
              dotClass="bg-emerald-500"
              primary={driver.tripOrigin.cityName ?? driver.tripOrigin.locationName}
              lat={driver.tripOrigin.lat}
              lng={driver.tripOrigin.lng}
            />
          )}
          {(driver.currentCity || driver.lat != null) && (
            <TripRow
              label="Now"
              dotClass="bg-orange-400"
              primary={driver.currentCity ?? driver.lastDrivingPoint?.locationName ?? null}
              lat={driver.lat}
              lng={driver.lng}
            />
          )}
          {driver.currentRoad && (driver.currentRoad.roadName || driver.currentRoad.speedLimitMph != null) && (
            <p className="text-xs text-muted-foreground truncate">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 mr-1.5 align-middle" />
              {driver.currentRoad.roadName ?? driver.currentRoad.classification}
              {driver.currentRoad.speedLimitMph != null && ` · ${driver.currentRoad.speedLimitMph} mph limit`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TripRow({
  label,
  dotClass,
  primary,
  lat,
  lng,
}: {
  label: string;
  dotClass: string;
  primary: string | null | undefined;
  lat: number | null;
  lng: number | null;
}) {
  const hasCoords = lat != null && lng != null;
  return (
    <div className="text-xs text-muted-foreground">
      <p className="truncate">
        <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle ${dotClass}`} />
        <span className="font-medium text-foreground/80 mr-1">{label}</span>
        {primary ?? (hasCoords ? `${lat!.toFixed(4)}°, ${lng!.toFixed(4)}°` : "—")}
      </p>
      {primary && hasCoords && (
        <p className="text-[10px] text-muted-foreground/70 truncate font-mono ml-5">
          {lat!.toFixed(4)}°, {lng!.toFixed(4)}°
        </p>
      )}
    </div>
  );
}
