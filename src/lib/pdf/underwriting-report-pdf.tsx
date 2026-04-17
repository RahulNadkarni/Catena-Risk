/**
 * Underwriting report PDF — 4 pages
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
import type { RiskScore } from "@/lib/risk/scoring";
import type { ProspectPayload } from "@/lib/db/submissions";
import type { ApiTraceEntry } from "@/lib/db/submissions";
import type { FleetDossier } from "@/lib/domain/fleet-dossier";

Font.registerHyphenationCallback((word) => [word]);

const BRAND = "#0f766e";
const DANGER = "#dc2626";
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
    alignItems: "flex-start",
    borderBottom: `1 solid ${BORDER}`,
    paddingBottom: 10,
    marginBottom: 18,
  },
  headerTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BRAND },
  headerSub: { fontSize: 8, color: MUTED, marginTop: 2 },
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
  card: {
    border: `1 solid ${BORDER}`,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  label: { color: MUTED, flex: 1 },
  value: { fontFamily: "Helvetica-Bold", textAlign: "right" },
  scoreBig: { fontSize: 36, fontFamily: "Helvetica-Bold", color: BRAND },
  tierBadge: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2 },
  narrative: { fontSize: 8.5, lineHeight: 1.5, color: "#374151" },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 12, color: MUTED },
});

const TIER_COLOR: Record<string, string> = {
  Preferred: "#059669",
  Standard: "#2563eb",
  Substandard: "#d97706",
  Decline: DANGER,
};

function Header({ title, page, total, generatedAt }: { title: string; page: number; total: number; generatedAt: string }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Keystone Risk Workbench</Text>
        <Text style={styles.headerSub}>{title}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 8, color: MUTED }}>Page {page} of {total}</Text>
        <Text style={{ fontSize: 8, color: MUTED }}>Generated {generatedAt}</Text>
      </View>
    </View>
  );
}

function Footer({ text }: { text: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{text}</Text>
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
  score: RiskScore;
  prospect: ProspectPayload;
  dossier: FleetDossier;
  apiTrace: ApiTraceEntry[];
}

export function UnderwritingReportPDF({ score, prospect, dossier, apiTrace }: Props) {
  const generatedAt = new Date().toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" });
  const footer = "Confidential — Insurance Underwriting Work Product";
  const tierColor = TIER_COLOR[score.tier] ?? MUTED;

  const activeTrace = apiTrace.filter((e) => e.ms > 0 && e.status === 200);

  return (
    <Document title={`Underwriting Report — ${prospect.legalName ?? "Fleet"}`} creator="Keystone Risk Workbench">

      {/* Page 1: Cover */}
      <Page size="LETTER" style={styles.page}>
        <Header title="Underwriting Report" page={1} total={4} generatedAt={generatedAt} />

        <View style={{ ...styles.card, borderColor: tierColor, marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>Risk assessment summary</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 24 }}>
            <View style={{ alignItems: "center", width: 80 }}>
              <Text style={{ ...styles.scoreBig, color: tierColor }}>{Math.round(score.compositeScore)}</Text>
              <Text style={{ fontSize: 8, color: MUTED }}>/ 100</Text>
              <Text style={{ ...styles.tierBadge, color: tierColor }}>{score.tier}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Row label="Decision" value={score.recommendedAction.decision.replace(/_/g, " ").toUpperCase()} />
              {score.recommendedAction.surchargePct != null && (
                <Row label="Surcharge" value={`${score.recommendedAction.surchargePct}%`} />
              )}
              <Row label="Confidence" value={score.confidence.toUpperCase()} />
              <Row label="Data window" value={`${score.dataWindowDays} days`} />
            </View>
          </View>
          <Text style={{ ...styles.narrative, marginTop: 8 }}>{score.recommendedAction.rationale}</Text>
        </View>

        <Text style={styles.sectionTitle}>Prospect information</Text>
        <View style={styles.card}>
          <Row label="Legal name" value={prospect.legalName ?? "—"} />
          <Row label="DOT number" value={prospect.dotNumber ?? "—"} />
          <Row label="MC number" value={prospect.mcNumber ?? "—"} />
          <Row label="Fleet size (est.)" value={prospect.estimatedFleetSize ?? "—"} />
          <Row label="Primary states" value={prospect.primaryStates?.join(", ") ?? "—"} />
          <Row label="Commodities" value={prospect.commodities?.join(", ") ?? "—"} />
        </View>

        <Footer text={footer} />
      </Page>

      {/* Page 2: Sub-scores and narrative */}
      <Page size="LETTER" style={styles.page}>
        <Header title="Sub-scores & Narrative" page={2} total={4} generatedAt={generatedAt} />

        <Text style={styles.sectionTitle}>Six-factor risk breakdown</Text>
        {score.subScores.map((sub) => (
          <View key={sub.category} style={{ ...styles.card, marginBottom: 6 }}>
            <View style={styles.row}>
              <Text style={{ fontFamily: "Helvetica-Bold", flex: 1, textTransform: "capitalize" }}>
                {sub.category.replace(/([A-Z])/g, " $1")}
              </Text>
              <Text style={{ fontFamily: "Helvetica-Bold", color: sub.subScore >= 65 ? "#059669" : sub.subScore >= 50 ? "#d97706" : DANGER }}>
                {Math.round(sub.subScore)}/100 · {(sub.weight * 100).toFixed(0)}% weight
              </Text>
            </View>
            <Text style={styles.narrative}>{sub.narrative}</Text>
          </View>
        ))}

        <Footer text={footer} />
      </Page>

      {/* Page 3: Exposure profile */}
      <Page size="LETTER" style={styles.page}>
        <Header title="Exposure Profile" page={3} total={4} generatedAt={generatedAt} />

        <Text style={styles.sectionTitle}>Fleet telematics window</Text>
        <View style={styles.card}>
          <Row label="Fleet ID" value={dossier.fleetId} />
          <Row label="Data window start" value={dossier.window.start.slice(0, 10)} />
          <Row label="Data window end" value={dossier.window.end.slice(0, 10)} />
          <Row label="Vehicles" value={dossier.vehicles.length.toString()} />
          <Row label="Driver safety events" value={dossier.safetyEvents.length.toString()} />
          <Row label="HOS violations" value={dossier.hosViolations.length.toString()} />
          <Row label="DVIR logs" value={dossier.dvirLogs.length.toString()} />
          <Row label="Location pings" value={dossier.vehicleLocations.length.toString()} />
        </View>

        <Text style={styles.sectionTitle}>Top risk drivers</Text>
        {score.topRiskDrivers.map((sub) => (
          <View key={sub.category} style={styles.bullet}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={{ flex: 1, color: "#374151", fontSize: 8.5 }}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{sub.category.replace(/([A-Z])/g, " $1")} </Text>
              — sub-score {Math.round(sub.subScore)}/100, {(sub.peerPercentile).toFixed(0)}th peer percentile (higher = worse)
            </Text>
          </View>
        ))}

        {score.recommendedAction.conditions?.length ? (
          <>
            <Text style={styles.sectionTitle}>Binding conditions</Text>
            {score.recommendedAction.conditions.map((c, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={{ flex: 1, color: "#374151", fontSize: 8.5 }}>{c}</Text>
              </View>
            ))}
          </>
        ) : null}

        <Footer text={footer} />
      </Page>

      {/* Page 4: Data provenance & API trace */}
      <Page size="LETTER" style={styles.page}>
        <Header title="Data Provenance & API Trace" page={4} total={4} generatedAt={generatedAt} />

        <Text style={styles.sectionTitle}>Chain of custody</Text>
        <View style={styles.card}>
          <Row label="Data source" value="Catena Clearing API" />
          <Row label="Auth protocol" value="OAuth 2.0 client credentials" />
          <Row label="Endpoints called" value={`${activeTrace.length} successful calls`} />
          <Row label="Generated at" value={generatedAt} />
        </View>

        <Text style={styles.sectionTitle}>API call log</Text>
        {activeTrace.slice(0, 20).map((entry, i) => (
          <View key={i} style={{ ...styles.row, marginBottom: 3, borderBottom: `1 solid ${BORDER}`, paddingBottom: 2 }}>
            <Text style={{ color: MUTED, width: 60 }}>{entry.method}</Text>
            <Text style={{ flex: 1, color: "#374151", fontSize: 8 }}>{entry.path}</Text>
            <Text style={{ color: MUTED, width: 50, textAlign: "right" }}>{entry.ms}ms</Text>
          </View>
        ))}
        {activeTrace.length > 20 && (
          <Text style={{ color: MUTED, fontSize: 8, marginTop: 4 }}>+ {activeTrace.length - 20} more entries</Text>
        )}

        <Footer text={footer} />
      </Page>

    </Document>
  );
}
