import { format } from "date-fns";
import type { DefensePacket } from "./types";

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

export function buildDefenseNarrative(packet: DefensePacket): string {
  const {
    claimNumber,
    incidentAt,
    incidentLocation,
    incidentDescription,
    driverName,
    vehicleUnit,
    vehicleVin,
    speedAtImpactMph,
    speedLimitMph,
    maxSpeedInWindowMph,
    safetyEventsWindow,
    hosSnapshot,
    dvirRecords,
    disposition,
    dispositionRationale,
    dispositionFactors,
  } = packet;

  const p1 = `This defense analysis covers claim **${claimNumber}** — a **${incidentDescription.toLowerCase()}** incident occurring at **${incidentLocation}** on **${fmtDate(incidentAt)}**. The involved unit is **${vehicleUnit}** (VIN ${vehicleVin}), operated by driver **${driverName}**. All telematics evidence was retrieved via the Catena Clearing unified data layer and covers a 72-hour pre-incident window. Data marked as synthetic is clearly identified and is provided for demonstration purposes only.`;

  // Speed paragraph
  let p2: string;
  if (speedAtImpactMph <= speedLimitMph) {
    p2 = `**Speed telemetry** demonstrates the vehicle was traveling at **${speedAtImpactMph} mph** at time of impact — **${speedLimitMph - speedAtImpactMph} mph below** the posted ${speedLimitMph} mph limit. The maximum recorded speed in the 72-minute pre-incident window was ${maxSpeedInWindowMph.toFixed(1)} mph, also within the posted limit. Speed data does not support the plaintiff's allegation of excess velocity and constitutes a significant exonerating factor.`;
  } else {
    p2 = `**Speed telemetry** records the vehicle traveling at **${speedAtImpactMph} mph** at time of impact — **${speedAtImpactMph - speedLimitMph} mph above** the posted ${speedLimitMph} mph limit. The maximum recorded speed in the 72-minute window was ${maxSpeedInWindowMph.toFixed(1)} mph. Speed violations documented via telematics are admissible and constitute a material liability factor that opposing counsel will likely exploit.`;
  }

  // Safety events paragraph
  let p3: string;
  if (safetyEventsWindow.length === 0) {
    p3 = `**Behavioral event record:** The 30-minute pre-incident window is **clean** — zero hard-braking, harsh-cornering, speeding, or distraction events were recorded. The absence of pre-incident behavioral alerts is a favorable finding, indicating the driver was operating within normal parameters immediately prior to the collision.`;
  } else {
    const evtList = safetyEventsWindow
      .map(
        (e) =>
          `a **${e.type.replace("_", "-")}** event (severity: ${e.severity}) at T${e.offsetMinutes < 0 ? e.offsetMinutes : "+" + e.offsetMinutes} minutes (${e.description})`,
      )
      .join("; ");
    p3 = `**Behavioral event record:** The pre-incident window contains ${safetyEventsWindow.length} recorded event(s): ${evtList}. These events are time-stamped with sub-minute precision and are directly relevant to plaintiff's theory of liability. The sequence — ${safetyEventsWindow.map((e) => e.type.replace("_", "-")).join(" → ")} — is consistent with aggressive vehicle operation immediately prior to impact.`;
  }

  // HOS paragraph
  let p4: string;
  const driveRemaining = hosSnapshot.hoursUntilDriveLimit;
  const cycleRemaining = hosSnapshot.hoursUntilCycleLimit;
  if (hosSnapshot.isCompliant && driveRemaining >= 3) {
    p4 = `**Hours of Service:** ELD records confirm the driver had **${fmtHours(driveRemaining)}** of drive time remaining under the 11-hour rule and **${fmtHours(cycleRemaining)}** remaining in the 70-hour/8-day cycle. Duty status at incident time was **${hosSnapshot.dutyStatusAtIncident.replace(/_/g, " ")}**. No HOS violations are present in the record; fatigue as a contributing factor is not supported by the telematics evidence.`;
  } else {
    p4 = `**Hours of Service:** ELD records show the driver had only **${fmtHours(driveRemaining)}** of drive time remaining under the 11-hour rule and **${fmtHours(cycleRemaining)}** remaining in the 70-hour cycle at time of incident. ${hosSnapshot.violationNote ?? ""} While the driver was technically compliant at the moment of impact, courts and juries frequently view sub-1-hour remaining drive time as an operational fatigue indicator. This constitutes a significant liability exposure that should be assessed in settlement valuation.`;
  }

  // DVIR paragraph
  const unsatRecords = dvirRecords.filter((r) => r.status === "unsatisfactory");
  const openCritical = unsatRecords.flatMap((r) => r.defects.filter((d) => d.severity === "critical" && !d.resolvedAt));
  let p5: string;
  if (openCritical.length === 0) {
    const totalInspections = dvirRecords.length;
    p5 = `**Vehicle maintenance:** All ${totalInspections} DVIR inspection(s) in the 60-day pre-incident window returned **satisfactory** with no open defects at time of incident. No brake, tire, lighting, or structural defects are documented. Vehicle condition is not a contributory factor based on the available inspection record.`;
  } else {
    const defectList = openCritical.map((d) => `**${d.component}** (critical, unresolved)`).join("; ");
    const daysOutstanding = openCritical
      .map((d) => {
        const rec = dvrRecordForDefect(dvirRecords, d.id);
        if (!rec) return "";
        const daysAgo = Math.round(
          (new Date(incidentAt).getTime() - new Date(rec.inspectedAt).getTime()) / (1000 * 60 * 60 * 24),
        );
        return `${daysAgo} days prior`;
      })
      .filter(Boolean)
      .join(", ");
    p5 = `**Vehicle maintenance:** DVIR records identify ${openCritical.length} **critical, unresolved defect(s)** flagged ${daysOutstanding}: ${defectList}. Unresolved critical defects — particularly brake-system defects — create direct strict-liability exposure under FMCSA 49 CFR Part 396. Plaintiff counsel will subpoena these records. Settlement valuation must account for the substantial punitive-damages risk arising from documented deferred maintenance.`;
  }

  // Disposition paragraph
  const isFavorable = disposition === "STRONG_DEFENSE_POSITION";
  const factorBullets = dispositionFactors.map((f) => `- ${f}`).join("\n");
  const p6 = `**Disposition: ${isFavorable ? "STRONG DEFENSE POSITION" : "UNFAVORABLE EVIDENCE — CONSIDER EARLY SETTLEMENT"}**\n\n${dispositionRationale}\n\n**Key factors:**\n${factorBullets}`;

  return [p1, p2, p3, p4, p5, p6].join("\n\n");
}

function dvrRecordForDefect(records: DefensePacket["dvirRecords"], defectId: string) {
  return records.find((r) => r.defects.some((d) => d.id === defectId));
}
