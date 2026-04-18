import { format } from "date-fns";
import type { IncidentPacket } from "./types";

function fmtDate(iso: string): string {
  try {
    return format(new Date(iso), "MMMM d, yyyy 'at' HH:mm UTC");
  } catch {
    return iso;
  }
}

function fmtHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/** Build a factual incident summary for insurers — no legal strategy, no settlement recommendations. */
export function buildIncidentSummary(packet: IncidentPacket): string {
  const {
    claimNumber,
    incidentAt,
    incidentLocation,
    incidentDescription,
    driverName,
    driverId,
    vehicleUnit,
    vehicleVin,
    speedAtImpactMph,
    postedSpeedLimitMph,
    maxSpeedInWindowMph,
    safetyEventsInWindow,
    hosSnapshot,
    dvirRecords,
    weatherContext,
    roadContext,
    carrierContext,
    dataCompleteness,
  } = packet;

  const p1 = `**Incident Report — Claim ${claimNumber}**\n\n` +
    `Incident occurred at **${incidentLocation}** on **${fmtDate(incidentAt)}**. ` +
    `Description: ${incidentDescription}. ` +
    `Involved unit: **${vehicleUnit}** (VIN: ${vehicleVin}), driver: **${driverName}**` +
    (driverId ? ` (ID: ${driverId})` : "") + `. ` +
    `All telematics data sourced from the Catena Clearing unified data layer. ` +
    `Data completeness: **${dataCompleteness.status}**.`;

  // Speed
  const p2 = speedAtImpactMph == null
    ? "**Speed Telemetry:** Vehicle speed was not reported by the TSP for the 72-minute pre-incident window."
    : (() => {
        const speedRelative = postedSpeedLimitMph != null
          ? speedAtImpactMph <= postedSpeedLimitMph
            ? `**${postedSpeedLimitMph - speedAtImpactMph} mph below** the posted ${postedSpeedLimitMph} mph limit`
            : `**${speedAtImpactMph - postedSpeedLimitMph} mph above** the posted ${postedSpeedLimitMph} mph limit`
          : "(posted speed limit unavailable from OSM)";
        return `**Speed Telemetry:** Vehicle speed at impact was **${speedAtImpactMph} mph** — ${speedRelative}. ` +
          (maxSpeedInWindowMph != null
            ? `Maximum recorded speed in the 72-minute pre-incident window: ${maxSpeedInWindowMph.toFixed(1)} mph. `
            : "") +
          (roadContext?.source === "osm" && roadContext.postedSpeedLimitMph
            ? `Speed limit sourced from OpenStreetMap (OSM way ${roadContext.osmWayId ?? "unknown"}).`
            : "Speed limit not available from external sources.");
      })();

  // Safety events
  const p3 = safetyEventsInWindow.length === 0
    ? `**Pre-Incident Behavior (30-min window):** No hard-braking, harsh-cornering, speeding, or distraction events recorded in the 30 minutes preceding the incident.`
    : `**Pre-Incident Behavior (30-min window):** ${safetyEventsInWindow.length} safety event(s) recorded: ` +
      safetyEventsInWindow
        .map((e) => `${e.type.replace(/_/g, " ")} (${e.severity}) at T${e.offsetMinutes}min`)
        .join("; ") + ".";

  // HOS
  const hos = hosSnapshot;
  const p4 = `**Hours of Service (at incident time):** Drive time used: ${fmtHours(hos.driveTimeUsedHours)} of ${hos.driveTimeLimitHours}h (${fmtHours(hos.hoursUntilDriveLimit)} remaining). ` +
    `Cycle used: ${fmtHours(hos.cycleUsedHours)} of ${hos.cycleLimitHours}h (${fmtHours(hos.hoursUntilCycleLimit)} remaining). ` +
    `Duty status at incident: **${hos.dutyStatusAtIncident.replace(/_/g, " ")}**. ` +
    `HOS compliance: **${hos.isCompliant ? "Compliant" : "Non-compliant"}**.` +
    (hos.violationNote ? ` Note: ${hos.violationNote}` : "");

  // DVIR
  const unsatRecords = dvirRecords.filter((r) => r.status === "unsatisfactory");
  const openCritical = unsatRecords.flatMap((r) =>
    r.defects.filter((d) => d.severity === "critical" && !d.resolvedAt),
  );
  const p5 = openCritical.length === 0
    ? `**Vehicle Inspection (60-day window):** ${dvirRecords.length} DVIR record(s) on file. ` +
      (dvirRecords.length > 0
        ? `${unsatRecords.length === 0 ? "All inspections returned satisfactory with no open defects." : `${unsatRecords.length} unsatisfactory record(s); no open critical defects at incident time.`}`
        : "No DVIR records available.")
    : `**Vehicle Inspection (60-day window):** ${openCritical.length} open critical defect(s) at incident time: ` +
      openCritical.map((d) => `${d.component} (unresolved)`).join("; ") + `. ` +
      `Defects documented via DVIR; resolution status: unresolved as of incident date.`;

  // Weather
  let p6 = "";
  if (weatherContext) {
    if (weatherContext.source === "noaa") {
      p6 = `**Weather Conditions (NOAA):** Station: ${weatherContext.stationName ?? weatherContext.stationId} ` +
        `(${weatherContext.stationDistanceKm} km from incident). ` +
        `${weatherContext.conditionDescription ?? "Conditions recorded"}. ` +
        `Road condition: **${weatherContext.roadCondition}**.` +
        (weatherContext.rawObservationUrl ? ` Source: ${weatherContext.rawObservationUrl}` : "");
    } else {
      p6 = `**Weather Conditions:** NOAA data unavailable — ${weatherContext.conditionDescription ?? "fetch failed"}.`;
    }
  }

  // Carrier safety
  let p7 = "";
  if (carrierContext) {
    if (carrierContext.source === "fmcsa" && carrierContext.dotNumber) {
      p7 = `**Carrier Safety (FMCSA SAFER):** DOT# ${carrierContext.dotNumber} — ${carrierContext.carrierName ?? "carrier name unavailable"}. ` +
        `Safety rating: **${carrierContext.safetyRating ?? "not rated"}**. ` +
        (carrierContext.crashTotal24m != null ? `Crashes (24m): ${carrierContext.crashTotal24m}. ` : "") +
        (carrierContext.outOfServiceRateDrivers != null
          ? `Driver OOS rate: ${(carrierContext.outOfServiceRateDrivers * 100).toFixed(1)}%. `
          : "");
    } else {
      p7 = `**Carrier Safety:** FMCSA data unavailable.`;
    }
  }

  // Data completeness note
  const missing = dataCompleteness.missingFields;
  const p8 = missing.length > 0
    ? `**Data Gaps:** The following fields could not be populated from available sources: ${missing.join(", ")}.`
    : `**Data Completeness:** All primary evidence fields populated.`;

  return [p1, p2, p3, p4, p5, p6, p7, p8]
    .filter(Boolean)
    .join("\n\n");
}
