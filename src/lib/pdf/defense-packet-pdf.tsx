/**
 * Defense packet PDF — 5 pages
 * Rendered server-side with @react-pdf/renderer
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
import type { DefensePacket } from "@/lib/claims/types";

Font.registerHyphenationCallback((word) => [word]);

const BRAND = "#0f766e";
const DANGER = "#dc2626";
const AMBER = "#d97706";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const PAGE_PAD = 40;

const DISPOSITION_COLOR: Record<string, string> = {
  STRONG_DEFENSE_POSITION: "#059669",
  UNFAVORABLE_EVIDENCE_CONSIDER_SETTLEMENT: DANGER,
  NEUTRAL_FURTHER_INVESTIGATION: AMBER,
};

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

function Header({ p, total, claimId, gen }: { p: number; total: number; claimId: string; gen: string }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Keystone Defense Packet</Text>
        <Text style={{ fontSize: 8, color: MUTED }}>Claim {claimId} · Page {p} of {total}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 8, color: MUTED }}>Generated {gen}</Text>
        <Text style={{ fontSize: 7, color: MUTED }}>All telematics via Catena Clearing API</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>Confidential — Insurance Defense Work Product / Attorney-Client Privileged</Text>
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
  packet: DefensePacket;
}

export function DefensePacketPDF({ packet }: Props) {
  const gen = new Date().toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" });
  const dispColor = DISPOSITION_COLOR[packet.disposition] ?? MUTED;
  const dispLabel = packet.disposition === "STRONG_DEFENSE_POSITION"
    ? "STRONG DEFENSE POSITION"
    : packet.disposition === "UNFAVORABLE_EVIDENCE_CONSIDER_SETTLEMENT"
      ? "UNFAVORABLE — CONSIDER EARLY SETTLEMENT"
      : "NEUTRAL — FURTHER INVESTIGATION";

  const isOverLimit = packet.speedAtImpactMph > packet.speedLimitMph;
  const unresolvedCritical = packet.dvirRecords
    .flatMap((r) => r.defects)
    .filter((d) => d.severity === "critical" && !d.resolvedAt);

  // Build speed timeline text summary (no chart in PDF — text table)
  const speedMph = packet.speedTimeline.map((s) => s.speedMph);
  const avgSpeed = speedMph.length > 0 ? speedMph.reduce((a, b) => a + b, 0) / speedMph.length : 0;

  return (
    <Document title={`Defense Packet — Claim ${packet.claimNumber}`} creator="Keystone Risk Workbench">

      {/* Page 1: Executive summary & disposition */}
      <Page size="LETTER" style={styles.page}>
        <Header p={1} total={5} claimId={packet.claimNumber} gen={gen} />

        <View style={{ ...styles.card, borderColor: dispColor }}>
          <View style={styles.row}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, flex: 1 }}>Disposition</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: dispColor, fontSize: 9 }}>{dispLabel}</Text>
          </View>
          <Text style={{ ...styles.narrative, marginTop: 6 }}>{packet.dispositionRationale}</Text>
          <View style={{ marginTop: 8 }}>
            {packet.dispositionFactors.map((f, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={{ flex: 1, fontSize: 8.5, color: "#374151" }}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Incident summary</Text>
        <View style={styles.card}>
          <Row label="Claim #" value={packet.claimNumber} />
          <Row label="Incident date/time" value={fmtDate(packet.incidentAt)} />
          <Row label="Location" value={packet.incidentLocation} />
          <Row label="Description" value={packet.incidentDescription} />
          <Row label="Driver" value={packet.driverName} />
          <Row label="Vehicle unit" value={packet.vehicleUnit} />
          <Row label="VIN" value={packet.vehicleVin} />
        </View>

        <Footer />
      </Page>

      {/* Page 2: Speed timeline summary */}
      <Page size="LETTER" style={styles.page}>
        <Header p={2} total={5} claimId={packet.claimNumber} gen={gen} />

        <Text style={styles.sectionTitle}>Speed telemetry (72-min pre-incident window)</Text>
        <View style={styles.card}>
          <Row label="Speed at impact" value={`${packet.speedAtImpactMph} mph`} />
          <Row label="Posted speed limit" value={`${packet.speedLimitMph} mph`} />
          <Row label="Delta" value={isOverLimit ? `${packet.speedAtImpactMph - packet.speedLimitMph} mph OVER limit` : `${packet.speedLimitMph - packet.speedAtImpactMph} mph below limit`} />
          <Row label="Max speed in window" value={`${packet.maxSpeedInWindowMph.toFixed(1)} mph`} />
          <Row label="Average speed in window" value={`${avgSpeed.toFixed(1)} mph`} />
          <Row label="Speed samples" value={`${packet.speedTimeline.length} (1-min interval)`} />
        </View>

        {/* Speed table — first 20 and last 10 points around impact */}
        <Text style={styles.sectionTitle}>Selected speed readings</Text>
        <View style={styles.card}>
          <View style={{ ...styles.row, borderBottom: `1 solid ${BORDER}`, paddingBottom: 3, marginBottom: 4 }}>
            <Text style={{ color: MUTED, width: 70 }}>Offset (min)</Text>
            <Text style={{ color: MUTED, flex: 1, textAlign: "center" }}>Speed (mph)</Text>
            <Text style={{ color: MUTED, width: 80, textAlign: "right" }}>Vs limit</Text>
          </View>
          {[
            ...packet.speedTimeline.slice(0, 10),
            ...packet.speedTimeline.slice(-12),
          ].map((s, i) => (
            <View key={i} style={{ ...styles.row, paddingVertical: 1 }}>
              <Text style={{ width: 70, color: s.offsetMinutes === 0 ? DANGER : MUTED }}>
                {s.offsetMinutes === 0 ? "IMPACT" : `T${s.offsetMinutes}m`}
              </Text>
              <Text style={{ flex: 1, textAlign: "center", color: s.speedMph > packet.speedLimitMph ? DANGER : "#374151", fontFamily: s.offsetMinutes === 0 ? "Helvetica-Bold" : "Helvetica" }}>
                {s.speedMph.toFixed(1)}
              </Text>
              <Text style={{ width: 80, textAlign: "right", color: s.speedMph > packet.speedLimitMph ? DANGER : "#059669", fontSize: 8 }}>
                {s.speedMph > packet.speedLimitMph ? `+${(s.speedMph - packet.speedLimitMph).toFixed(1)} over` : `${(packet.speedLimitMph - s.speedMph).toFixed(1)} below`}
              </Text>
            </View>
          ))}
          <Text style={{ color: MUTED, fontSize: 7, marginTop: 6 }}>Showing 10 earliest + 12 latest of {packet.speedTimeline.length} total readings. Full 72-minute log available on request.</Text>
        </View>

        {/* Safety events */}
        <Text style={styles.sectionTitle}>Pre-incident safety events ({packet.safetyEventsWindow.length} events)</Text>
        {packet.safetyEventsWindow.length === 0 ? (
          <Text style={{ color: "#059669", fontSize: 9 }}>No safety events recorded in 30-minute pre-incident window — favorable evidence.</Text>
        ) : (
          packet.safetyEventsWindow.map((evt) => (
            <View key={evt.id} style={{ ...styles.card, marginBottom: 4 }}>
              <Row label={`T${evt.offsetMinutes}min — ${evt.type.replace(/_/g, " ")}`} value={evt.severity.toUpperCase()} />
              <Text style={styles.narrative}>{evt.description}</Text>
            </View>
          ))
        )}

        <Footer />
      </Page>

      {/* Page 3: Driver compliance — HOS */}
      <Page size="LETTER" style={styles.page}>
        <Header p={3} total={5} claimId={packet.claimNumber} gen={gen} />

        <Text style={styles.sectionTitle}>Driver compliance at incident time</Text>
        <View style={{ ...styles.card, borderColor: packet.hosSnapshot.isCompliant ? "#059669" : DANGER }}>
          <View style={{ ...styles.row, marginBottom: 6 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", flex: 1 }}>HOS status</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: packet.hosSnapshot.isCompliant ? "#059669" : DANGER }}>
              {packet.hosSnapshot.isCompliant ? "COMPLIANT" : "VIOLATION"}
            </Text>
          </View>
          <Row label="Drive time used" value={`${fmtH(packet.hosSnapshot.driveTimeUsedHours)} / ${packet.hosSnapshot.driveTimeLimitHours}h`} />
          <Row label="Drive time remaining" value={fmtH(packet.hosSnapshot.hoursUntilDriveLimit)} />
          <Row label="70-hr cycle used" value={`${fmtH(packet.hosSnapshot.cycleUsedHours)} / ${packet.hosSnapshot.cycleLimitHours}h`} />
          <Row label="Cycle time remaining" value={fmtH(packet.hosSnapshot.hoursUntilCycleLimit)} />
          <Row label="Duty status at incident" value={packet.hosSnapshot.dutyStatusAtIncident.replace(/_/g, " ")} />
          {packet.hosSnapshot.violationNote && (
            <Text style={{ ...styles.narrative, marginTop: 6, color: AMBER }}>
              ⚠ {packet.hosSnapshot.violationNote}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Driver safety profile</Text>
        <View style={styles.card}>
          <Row label="Safety score" value={`${packet.driverSafetyScore}/100`} />
          <Row label="HOS violations (90d)" value={packet.driverHosViolations90d.toString()} />
          <Row label="Driver tenure" value={`${packet.driverTenureMonths} months`} />
        </View>

        <Footer />
      </Page>

      {/* Page 4: Vehicle maintenance & event log */}
      <Page size="LETTER" style={styles.page}>
        <Header p={4} total={5} claimId={packet.claimNumber} gen={gen} />

        <Text style={styles.sectionTitle}>DVIR records (60-day window)</Text>
        <View style={{ ...styles.card, borderColor: unresolvedCritical.length > 0 ? DANGER : "#059669" }}>
          <Row label="Total inspections" value={packet.dvirRecords.length.toString()} />
          <Row label="Unsatisfactory inspections" value={packet.dvirRecords.filter((r) => r.status === "unsatisfactory").length.toString()} />
          <Row label="Unresolved critical defects" value={unresolvedCritical.length > 0 ? `${unresolvedCritical.length} — see below` : "None"} />
        </View>
        {unresolvedCritical.map((d) => (
          <View key={d.id} style={{ ...styles.card, borderColor: DANGER, marginBottom: 4 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", color: DANGER, fontSize: 8.5 }}>[CRITICAL — UNRESOLVED] {d.component}</Text>
            <Text style={styles.narrative}>{d.note}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Fuel stops (72-hour window)</Text>
        {packet.fuelStops.map((stop) => (
          <View key={stop.id} style={{ ...styles.row, paddingVertical: 2, borderBottom: `1 solid ${BORDER}` }}>
            <Text style={{ flex: 1, fontSize: 8.5 }}>{stop.locationName}</Text>
            <Text style={{ color: MUTED, fontSize: 8.5 }}>{stop.gallons.toFixed(1)} gal · {fmtDate(stop.occurredAt)}</Text>
          </View>
        ))}
        <Text style={{ color: MUTED, fontSize: 7, marginTop: 4 }}>Fuel data synthetic for demo — Catena fuel API not yet in public spec.</Text>

        <Footer />
      </Page>

      {/* Page 5: Defense narrative & chain of custody */}
      <Page size="LETTER" style={styles.page}>
        <Header p={5} total={5} claimId={packet.claimNumber} gen={gen} />

        <Text style={styles.sectionTitle}>Defense narrative</Text>
        <View style={styles.card}>
          <Text style={styles.narrative}>{packet.defenseNarrative.replace(/\*\*/g, "")}</Text>
          <Text style={{ color: MUTED, fontSize: 7, marginTop: 8, borderTop: `1 solid ${BORDER}`, paddingTop: 4 }}>
            All data is synthetic and generated for demonstration purposes only. This narrative does not constitute legal advice.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Chain of custody</Text>
        <View style={styles.card}>
          <Row label="Data source" value="Catena Clearing API" />
          <Row label="Telematics window" value="72 hours pre-incident" />
          <Row label="Speed samples" value={`${packet.speedTimeline.length} (1-min interval)`} />
          <Row label="Route waypoints" value={`${packet.routeWaypoints.length} (15-min interval)`} />
          <Row label="DVIR records" value={`${packet.dvirRecords.length} inspections`} />
          <Row label="Generated at" value={gen} />
          <Text style={{ ...styles.narrative, marginTop: 6, color: MUTED }}>
            Evidence integrity: All telematics data retrieved via Catena Clearing&apos;s tamper-evident API pipeline.
            This packet was generated from Catena-sourced telematics data and is suitable for use in litigation support.
          </Text>
        </View>

        <Footer />
      </Page>

    </Document>
  );
}
