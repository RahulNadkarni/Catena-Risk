/**
 * Incident evidence PDF — rendered server-side with @react-pdf/renderer.
 * Factual evidence summary; no legal opinion or settlement recommendation.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import type { IncidentPacket } from "@/lib/claims/types";

Font.registerHyphenationCallback((word) => [word]);

const BRAND = "#0f766e";
const DANGER = "#dc2626";
const AMBER = "#d97706";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const PAGE_PAD = 40;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: PAGE_PAD,
    paddingBottom: 50,
    paddingHorizontal: PAGE_PAD,
    color: "#111827",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: `1 solid ${BORDER}`,
    paddingBottom: 10,
    marginBottom: 18,
  },
  headerTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BRAND },
  footer: {
    position: "absolute",
    bottom: 20,
    left: PAGE_PAD,
    right: PAGE_PAD,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: MUTED,
    borderTop: `1 solid ${BORDER}`,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    marginTop: 14,
    color: "#111",
  },
  card: { border: `1 solid ${BORDER}`, borderRadius: 4, padding: 10, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  label: { color: MUTED, flex: 1 },
  value: { fontFamily: "Helvetica-Bold", textAlign: "right" },
  narrative: { fontSize: 8.5, lineHeight: 1.5, color: "#374151" },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 12, color: MUTED },
});

function fmtDate(iso: string) {
  try { return format(new Date(iso), "MMM d, yyyy HH:mm 'UTC'"); }
  catch { return iso; }
}

function fmtH(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function PageHeader({ p, total, claimId, gen }: { p: number; total: number; claimId: string; gen: string }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Incident Evidence Report</Text>
        <Text style={{ fontSize: 8, color: MUTED }}>Claim {claimId} · Page {p} of {total}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 8, color: MUTED }}>Generated {gen}</Text>
        <Text style={{ fontSize: 7, color: MUTED }}>Catena Clearing API + NOAA + OSM</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>Confidential — Objective evidence summary for insurance underwriting / claims</Text>
      <Text>Powered by Catena Clearing</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

interface Props {
  packet: IncidentPacket;
}

export function DefensePacketPDF({ packet }: Props) {
  const gen = new Date().toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" });
  const isOverLimit = packet.postedSpeedLimitMph != null && packet.speedAtImpactMph != null && packet.speedAtImpactMph > packet.postedSpeedLimitMph;
  const unresolvedCritical = packet.dvirRecords
    .flatMap((r) => r.defects)
    .filter((d) => d.severity === "critical" && !d.resolvedAt);

  const speedMph = packet.speedTimeline.map((s) => s.speedMph);
  const avgSpeed = speedMph.length > 0 ? speedMph.reduce((a, b) => a + b, 0) / speedMph.length : 0;
  const realPings = packet.speedTimeline.filter((s) => s.fromApi).length;

  return (
    <Document title={`Incident Evidence — Claim ${packet.claimNumber}`} creator="Catena Risk Platform">

      {/* Page 1: Incident summary & data completeness */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader p={1} total={4} claimId={packet.claimNumber} gen={gen} />

        <View style={{ ...styles.card, borderColor: BRAND }}>
          <View style={styles.row}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, flex: 1 }}>Data Completeness</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: BRAND, fontSize: 9 }}>
              {packet.dataCompleteness.status}
            </Text>
          </View>
          {packet.dataCompleteness.apiFieldsPresent.length > 0 && (
            <Text style={{ ...styles.narrative, marginTop: 4, color: "#059669" }}>
              API confirmed: {packet.dataCompleteness.apiFieldsPresent.join(", ")}
            </Text>
          )}
          {packet.dataCompleteness.missingFields.length > 0 && (
            <Text style={{ ...styles.narrative, marginTop: 4, color: DANGER }}>
              Unavailable: {packet.dataCompleteness.missingFields.join(", ")}
            </Text>
          )}
          {packet.dataCompleteness.syntheticFields.length > 0 && (
            <Text style={{ ...styles.narrative, marginTop: 4, color: AMBER }}>
              Synthetic: {packet.dataCompleteness.syntheticFields.join(", ")}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Incident details</Text>
        <View style={styles.card}>
          <Row label="Claim #" value={packet.claimNumber} />
          <Row label="Incident date/time" value={fmtDate(packet.incidentAt)} />
          <Row label="Location" value={packet.incidentLocation} />
          <Row label="Description" value={packet.incidentDescription} />
          <Row label="Driver" value={packet.driverName} />
          {packet.driverId && <Row label="Driver ID" value={packet.driverId} />}
          <Row label="Vehicle unit" value={packet.vehicleUnit} />
          <Row label="VIN" value={packet.vehicleVin ?? "Not reported by TSP"} />
          <Row label="Driver tenure" value={packet.driverTenureMonths != null ? `${packet.driverTenureMonths} months` : "Not reported"} />
        </View>

        <Text style={styles.sectionTitle}>Incident summary narrative</Text>
        <View style={styles.card}>
          <Text style={styles.narrative}>{packet.incidentSummary.replace(/\*\*/g, "")}</Text>
        </View>

        <Footer />
      </Page>

      {/* Page 2: Speed & safety events */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader p={2} total={4} claimId={packet.claimNumber} gen={gen} />

        <Text style={styles.sectionTitle}>Speed telemetry (72-min pre-incident window)</Text>
        <View style={styles.card}>
          <Row label="Speed at impact" value={packet.speedAtImpactMph != null ? `${packet.speedAtImpactMph} mph` : "Not reported by TSP"} />
          <Row
            label="Posted speed limit"
            value={packet.postedSpeedLimitMph != null ? `${packet.postedSpeedLimitMph} mph (OSM)` : "Unavailable"}
          />
          {packet.postedSpeedLimitMph != null && packet.speedAtImpactMph != null && (
            <Row
              label="Delta vs. limit"
              value={isOverLimit
                ? `${packet.speedAtImpactMph - packet.postedSpeedLimitMph!} mph OVER`
                : `${packet.postedSpeedLimitMph! - packet.speedAtImpactMph} mph below`}
            />
          )}
          <Row label="Max speed in window" value={packet.maxSpeedInWindowMph != null ? `${packet.maxSpeedInWindowMph.toFixed(1)} mph` : "Not reported"} />
          <Row label="Average speed in window" value={`${avgSpeed.toFixed(1)} mph`} />
          <Row label="Speed samples (total)" value={`${packet.speedTimeline.length}`} />
          <Row label="Real API pings" value={`${realPings} of ${packet.speedTimeline.length}`} />
        </View>

        <Text style={styles.sectionTitle}>Selected speed readings</Text>
        <View style={styles.card}>
          <View style={{ ...styles.row, borderBottom: `1 solid ${BORDER}`, paddingBottom: 3, marginBottom: 4 }}>
            <Text style={{ color: MUTED, width: 70 }}>Offset (min)</Text>
            <Text style={{ color: MUTED, flex: 1, textAlign: "center" }}>Speed (mph)</Text>
            <Text style={{ color: MUTED, width: 50, textAlign: "right" }}>API?</Text>
          </View>
          {[...packet.speedTimeline.slice(0, 8), ...packet.speedTimeline.slice(-10)].map((s, i) => (
            <View key={i} style={{ ...styles.row, paddingVertical: 1 }}>
              <Text style={{ width: 70, color: s.offsetMinutes === 0 ? DANGER : MUTED }}>
                {s.offsetMinutes === 0 ? "IMPACT" : `T${s.offsetMinutes}m`}
              </Text>
              <Text style={{ flex: 1, textAlign: "center", fontFamily: s.offsetMinutes === 0 ? "Helvetica-Bold" : "Helvetica" }}>
                {s.speedMph.toFixed(1)}
              </Text>
              <Text style={{ width: 50, textAlign: "right", color: s.fromApi ? "#059669" : MUTED }}>
                {s.fromApi ? "API" : "est."}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Pre-incident safety events ({packet.safetyEventsInWindow.length})</Text>
        {packet.safetyEventsInWindow.length === 0 ? (
          <Text style={{ color: "#059669", fontSize: 9 }}>No safety events in 30-min pre-incident window.</Text>
        ) : (
          packet.safetyEventsInWindow.map((evt) => (
            <View key={evt.id} style={{ ...styles.card, marginBottom: 4 }}>
              <Row label={`T${evt.offsetMinutes}min — ${evt.type.replace(/_/g, " ")}`} value={evt.severity.toUpperCase()} />
              <Text style={styles.narrative}>{evt.description}</Text>
              <Text style={{ ...styles.narrative, color: MUTED }}>Raw: {evt.rawEventType}</Text>
            </View>
          ))
        )}

        <Footer />
      </Page>

      {/* Page 3: HOS, DVIR, driver profile */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader p={3} total={4} claimId={packet.claimNumber} gen={gen} />

        <Text style={styles.sectionTitle}>Hours of service at incident time</Text>
        <View style={{ ...styles.card, borderColor: packet.hosSnapshot.isCompliant ? "#059669" : DANGER }}>
          <Row label="Compliance status" value={packet.hosSnapshot.isCompliant ? "COMPLIANT" : "VIOLATION"} />
          <Row label="Drive time used" value={`${fmtH(packet.hosSnapshot.driveTimeUsedHours)} / ${packet.hosSnapshot.driveTimeLimitHours}h`} />
          <Row label="Drive time remaining" value={fmtH(packet.hosSnapshot.hoursUntilDriveLimit)} />
          <Row label="70-hr cycle used" value={`${fmtH(packet.hosSnapshot.cycleUsedHours)} / ${packet.hosSnapshot.cycleLimitHours}h`} />
          <Row label="Cycle time remaining" value={fmtH(packet.hosSnapshot.hoursUntilCycleLimit)} />
          {packet.hosSnapshot.availableShiftHours != null && (
            <Row label="Shift time remaining" value={fmtH(packet.hosSnapshot.availableShiftHours)} />
          )}
          <Row label="Duty status" value={packet.hosSnapshot.dutyStatusAtIncident.replace(/_/g, " ")} />
          {packet.hosSnapshot.violationNote && (
            <Text style={{ ...styles.narrative, marginTop: 6, color: AMBER }}>
              Note: {packet.hosSnapshot.violationNote}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Driver safety profile</Text>
        <View style={styles.card}>
          <Row label="Safety events (30d)" value={packet.driverSafetyEvents30d != null ? String(packet.driverSafetyEvents30d) : "unavailable"} />
          <Row label="HOS violations (90d)" value={String(packet.driverHosViolations90d)} />
          <Row label="HOS violations (30d)" value={packet.driverHosViolations30d != null ? String(packet.driverHosViolations30d) : "unavailable"} />
          <Row label="Driver tenure" value={`${packet.driverTenureMonths} months`} />
        </View>

        <Text style={styles.sectionTitle}>DVIR records (60-day window)</Text>
        <View style={{ ...styles.card, borderColor: unresolvedCritical.length > 0 ? DANGER : "#059669" }}>
          <Row label="Total inspections" value={String(packet.dvirRecords.length)} />
          <Row label="Unsatisfactory" value={String(packet.dvirRecords.filter((r) => r.status === "unsatisfactory").length)} />
          <Row label="Unresolved critical defects" value={unresolvedCritical.length > 0 ? String(unresolvedCritical.length) : "None"} />
        </View>
        {unresolvedCritical.map((d) => (
          <View key={d.id} style={{ ...styles.card, borderColor: DANGER, marginBottom: 4 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", color: DANGER, fontSize: 8.5 }}>[CRITICAL — UNRESOLVED] {d.component}</Text>
            <Text style={styles.narrative}>{d.note}</Text>
          </View>
        ))}

        <Footer />
      </Page>

      {/* Page 4: External enrichment & chain of custody */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader p={4} total={4} claimId={packet.claimNumber} gen={gen} />

        {packet.weatherContext && packet.weatherContext.source === "noaa" && (
          <>
            <Text style={styles.sectionTitle}>Weather conditions — NOAA (api.weather.gov)</Text>
            <View style={styles.card}>
              <Row label="Station" value={packet.weatherContext.stationName ?? packet.weatherContext.stationId ?? "—"} />
              <Row label="Distance from incident" value={`${packet.weatherContext.stationDistanceKm} km`} />
              <Row label="Conditions" value={packet.weatherContext.conditionDescription ?? "—"} />
              <Row label="Road condition derived" value={packet.weatherContext.roadCondition} />
              {packet.weatherContext.temperatureF != null && <Row label="Temperature" value={`${packet.weatherContext.temperatureF}°F`} />}
              {packet.weatherContext.windSpeedMph != null && <Row label="Wind speed" value={`${packet.weatherContext.windSpeedMph} mph`} />}
              {packet.weatherContext.visibilityMiles != null && <Row label="Visibility" value={`${packet.weatherContext.visibilityMiles} mi`} />}
              {packet.weatherContext.rawObservationUrl && (
                <Text style={{ ...styles.narrative, color: MUTED, marginTop: 4 }}>
                  Source: {packet.weatherContext.rawObservationUrl}
                </Text>
              )}
            </View>
          </>
        )}

        {packet.roadContext && packet.roadContext.source === "osm" && (
          <>
            <Text style={styles.sectionTitle}>Road context — OpenStreetMap Overpass</Text>
            <View style={styles.card}>
              {packet.roadContext.roadName && <Row label="Road name" value={packet.roadContext.roadName} />}
              <Row label="Classification" value={packet.roadContext.roadClassification ?? "unknown"} />
              <Row label="Posted speed limit" value={packet.roadContext.postedSpeedLimitMph != null ? `${packet.roadContext.postedSpeedLimitMph} mph` : "Not tagged"} />
              {packet.roadContext.osmWayId && <Row label="OSM way ID" value={packet.roadContext.osmWayId} />}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Chain of custody — evidence manifest</Text>
        <View style={styles.card}>
          <Row label="Telematics window" value="72 hours pre-incident" />
          <Row label="Speed samples" value={`${packet.speedTimeline.length} (1-min interval), ${realPings} from API`} />
          <Row label="Route waypoints" value={`${packet.routeWaypoints.length} (15-min interval)`} />
          <Row label="DVIR records" value={`${packet.dvirRecords.length} inspections`} />
          <Row label="Evidence manifest entries" value={String(packet.evidenceManifest.length)} />
          <Row label="Generated at" value={gen} />
        </View>

        {packet.evidenceManifest.length > 0 && (
          <>
            <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 4 }}>SHA-256 hashes (NIST chain-of-custody)</Text>
            {packet.evidenceManifest.map((e) => (
              <View key={e.id} style={{ ...styles.row, paddingVertical: 1 }}>
                <Text style={{ flex: 1, fontSize: 7.5, color: MUTED }}>{e.description}</Text>
                <Text style={{ width: 120, fontSize: 7, textAlign: "right", color: MUTED }}>{e.sha256.slice(0, 16)}…</Text>
              </View>
            ))}
          </>
        )}

        <View style={{ ...styles.card, marginTop: 16, borderColor: MUTED }}>
          <Text style={{ ...styles.narrative, color: MUTED }}>
            This document is an objective evidence summary generated from Catena Clearing telematics data,
            NOAA weather records (FRE 902 self-authenticating), and OpenStreetMap road data.
            No legal opinion, liability determination, or settlement recommendation is expressed or implied.
            All data provenance is tracked per field in the accompanying JSON packet.
          </Text>
        </View>

        <Footer />
      </Page>

    </Document>
  );
}
