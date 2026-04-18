/**
 * Seeds 2 demo incident packets from real Catena API data. Idempotent — safe to run multiple times.
 *
 * Both claims use buildRealSingleIncidentPacket — real driver, vehicle, HOS, DVIR, safety events,
 * GPS coordinates, NOAA weather, and OSM road context. No hardcoded scenario names or speeds.
 *
 * Claim KS-2026-0142: Driver with fewest safety events (lower-risk profile)
 * Claim KS-2026-0157: Driver with most safety events (higher-risk profile)
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CLAIMS = [
  { claimNumber: "KS-2026-0142", driverProfile: "fewest_events" as const },
  { claimNumber: "KS-2026-0157", driverProfile: "most_events" as const },
];

async function main() {
  const { buildRealSingleIncidentPacket } = await import(path.join(ROOT, "src/lib/claims/fetch-scenario.ts"));
  const { insertClaim, getClaimByNumber, getClaimsDb } = await import(path.join(ROOT, "src/lib/db/claims.ts"));

  // Delete any existing seeded demo claims so we re-pull with fresh API data
  const db = getClaimsDb();
  const existing = CLAIMS.filter(({ claimNumber: n }) => getClaimByNumber(n));
  if (existing.length > 0) {
    for (const { claimNumber: n } of existing) {
      db.prepare("DELETE FROM claims WHERE claim_number = ?").run(n);
      console.log(`[seed-claims] Cleared existing ${n}`);
    }
  }

  for (const { claimNumber, driverProfile } of CLAIMS) {
    console.log(`[seed-claims] Pulling ${claimNumber} from Catena API (profile: ${driverProfile})…`);
    try {
      const packet = await buildRealSingleIncidentPacket(claimNumber, { driverProfile });

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

      console.log(`[seed-claims] Seeded ${claimNumber}`);
      console.log(`  Driver   : ${packet.driverName}`);
      console.log(`  Vehicle  : ${packet.vehicleUnit}`);
      console.log(`  At       : ${packet.incidentAt}`);
      console.log(`  Location : ${packet.incidentLocation}`);
      console.log(`  Events   : ${packet.safetyEventsInWindow.length} in 30-min window`);
      console.log(`  HOS      : ${packet.hosSnapshot.dutyStatusAtIncident}`);
      console.log(`  Weather  : ${packet.weatherContext.source} — ${packet.weatherContext.conditionDescription}`);
      console.log(`  Quality  : ${packet.dataCompleteness.status}`);
    } catch (e) {
      console.error(`[seed-claims] Failed to seed ${claimNumber}:`, (e as Error).message);
    }
  }

  console.log("[seed-claims] Done.");
}

main().catch((e) => {
  console.error("[seed-claims] Error:", e);
  process.exit(1);
});
