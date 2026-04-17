/**
 * Seeds 2 demo claims into the SQLite database. Idempotent — safe to run multiple times.
 *
 * Claim KS-2026-0142: Exonerating scenario (strong defense position)
 * Claim KS-2026-0157: Inculpating scenario (unfavorable evidence — consider settlement)
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve project root so @/ aliases can be shimmed
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SCENARIO_IDS = ["KS-2026-0142", "KS-2026-0157"] as const;

async function main() {
  // Dynamic imports kept inside main() to avoid top-level await (CJS compat with tsx)
  const { generateDefensePacketFromApi } = await import(path.join(ROOT, "src/lib/claims/fetch-scenario.ts"));
  const { buildDefenseNarrative } = await import(path.join(ROOT, "src/lib/claims/narrative.ts"));
  const { insertClaim, getClaimByNumber } = await import(path.join(ROOT, "src/lib/db/claims.ts"));
  const { listHeroFleetIds } = await import(path.join(ROOT, "src/lib/underwriting/hero-fleets.ts"));

  const heroIds = await listHeroFleetIds();

  for (let i = 0; i < SCENARIO_IDS.length; i++) {
    const scenarioId = SCENARIO_IDS[i];
    const existing = getClaimByNumber(scenarioId);

    if (existing) {
      console.log(`[seed-claims] ${scenarioId} already exists — skipping`);
      continue;
    }

    const packet = await generateDefensePacketFromApi(scenarioId);
    packet.defenseNarrative = buildDefenseNarrative(packet);

    const fleetId = heroIds[i] ?? "demo";

    insertClaim({
      id: randomUUID(),
      claimNumber: packet.claimNumber,
      fleetId,
      status: "open",
      incidentAt: packet.incidentAt,
      incidentLocation: packet.incidentLocation,
      driverName: packet.driverName,
      vehicleUnit: packet.vehicleUnit,
      disposition: packet.disposition,
      defensePacket: packet,
    });

    console.log(`[seed-claims] Seeded ${scenarioId} (${packet.disposition})`);
  }

  console.log("[seed-claims] Done.");
}

main().catch((e) => {
  console.error("[seed-claims] Error:", e);
  process.exit(1);
});
