/**
 * Seeds one real-data claim (KS-REAL-2026-001) using live Catena API.
 * No synthetic data for speed, HOS, or location — all from ELD/API records.
 * Idempotent — safe to run multiple times.
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function main() {
  const { buildRealSingleIncidentPacket } = await import(path.join(ROOT, "src/lib/claims/fetch-scenario.ts"));
  const { insertClaim, getClaimByNumber } = await import(path.join(ROOT, "src/lib/db/claims.ts"));

  const CLAIM_NUMBER = "KS-REAL-2026-001";
  if (getClaimByNumber(CLAIM_NUMBER)) {
    console.log(`[seed-real-claim] ${CLAIM_NUMBER} already seeded — done.`);
    return;
  }

  console.log(`[seed-real-claim] Pulling ${CLAIM_NUMBER} from Catena API…`);
  const packet = await buildRealSingleIncidentPacket(CLAIM_NUMBER);

  insertClaim({
    id: randomUUID(),
    claimNumber: packet.claimNumber,
    fleetId: "demo",
    status: "open",
    incidentAt: packet.incidentAt,
    incidentLocation: packet.incidentLocation,
    driverName: packet.driverName,
    vehicleUnit: packet.vehicleUnit,
    dataCompleteness: packet.dataCompleteness.status,
    incidentPacket: packet,
  });

  console.log(`\n[seed-real-claim] Seeded: ${CLAIM_NUMBER}`);
  console.log(`  Driver      : ${packet.driverName}`);
  console.log(`  Vehicle     : ${packet.vehicleUnit}`);
  console.log(`  Incident at : ${packet.incidentAt}`);
  console.log(`  Location    : ${packet.incidentLocation}`);
  console.log(`  Speed pings : ${packet.speedTimeline.filter((s: { fromApi: boolean }) => s.fromApi).length} real / ${packet.speedTimeline.length} total`);
  console.log(`  Safety evts : ${packet.safetyEventsInWindow.length} in 30-min window`);
  console.log(`  DVIR logs   : ${packet.dvirRecords.length}`);
  console.log(`  HOS status  : ${packet.hosSnapshot.dutyStatusAtIncident ?? "unknown"} (avail drive: ${packet.hosSnapshot.hoursUntilDriveLimit?.toFixed(1)}h)`);
  console.log(`  Weather     : ${packet.weatherContext.source} — ${packet.weatherContext.conditionDescription}`);
  console.log(`  Road        : ${packet.roadContext.source === "osm" ? `${packet.roadContext.roadName} (${packet.roadContext.roadClassification})` : "OSM unavailable"}`);
  console.log(`  Completeness: ${packet.dataCompleteness.status}`);
  console.log(`  Manifest    : ${packet.evidenceManifest.length} entries`);
}

main().catch((e) => {
  console.error("[seed-real-claim] Failed:", e.message ?? e);
  process.exit(1);
});
