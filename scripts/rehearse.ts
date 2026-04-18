/**
 * Demo rehearsal script — runs before a demo to pre-warm all caches.
 *
 * 1. Scores all hero fleets and stores submissions in SQLite
 * 2. Seeds the 2 demo claims (idempotent)
 * 3. Prints a checklist with timing
 *
 * Usage: npm run rehearse
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FleetDossier } from "../src/lib/domain/fleet-dossier";
import type { RiskScore } from "../src/lib/risk/scoring";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function time<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const t0 = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - t0 };
}

async function main() {
  console.log("\n🚀 Keystone Risk — Demo Rehearsal\n");

  // Load modules
  const { listHeroFleetIds, listHeroFleetOptions } = await import(path.join(ROOT, "src/lib/underwriting/hero-fleets.ts"));
  const { buildFleetDossier } = await import(path.join(ROOT, "src/lib/domain/fleet-dossier.ts"));
  const { computeBehaviorRates, computeExposureMetrics } = await import(path.join(ROOT, "src/lib/domain/derived-metrics.ts"));
  const { computePeerBenchmarks } = await import(path.join(ROOT, "src/lib/risk/peer-benchmarks.ts"));
  const { computeRiskScore } = await import(path.join(ROOT, "src/lib/risk/scoring.ts"));
  const { insertSubmission, getDb } = await import(path.join(ROOT, "src/lib/db/submissions.ts"));
  const { buildRealSingleIncidentPacket } = await import(path.join(ROOT, "src/lib/claims/fetch-scenario.ts"));
  const { insertClaim, getClaimByNumber, getClaimsDb } = await import(path.join(ROOT, "src/lib/db/claims.ts"));

  const heroIds = await listHeroFleetIds();
  const heroOptions = await listHeroFleetOptions();
  const db = getDb();

  // Check which fleets already have submissions
  const existingFleets = new Set<string>(
    (db.prepare("SELECT DISTINCT fleet_id FROM submissions").all() as { fleet_id: string }[]).map((r) => r.fleet_id),
  );

  console.log(`ℹ  Hero fleets: ${heroIds.length} | Already scored: ${existingFleets.size}`);

  // Load all fixture dossiers once (peer benchmarks)
  const fixtureDossiers = await Promise.all(
    heroIds.map((id: string) => buildFleetDossier(id, { source: "fixtures" })),
  );
  const allDossiers = fixtureDossiers;
  const peerBenchmarks = computePeerBenchmarks(allDossiers);

  // Score each hero fleet if not already done
  let scored = 0;
  for (let i = 0; i < heroIds.length; i++) {
    const fleetId = heroIds[i]!;
    const label = (heroOptions as { id: string; label: string }[]).find((o) => o.id === fleetId)?.label ?? `Fleet ${i + 1}`;

    if (existingFleets.has(fleetId)) {
      console.log(`  ✓ ${label} — already scored, skipping`);
      continue;
    }

    process.stdout.write(`  ⏳ Scoring ${label}…`);
    const { result: dossier, ms } = await time(label, () =>
      buildFleetDossier(fleetId, { source: "fixtures" }) as Promise<FleetDossier>,
    );

    const exposure = computeExposureMetrics(dossier);
    const behaviorRates = computeBehaviorRates(dossier, exposure);
    const score = computeRiskScore({ behaviorRates, exposure, peerBenchmarks, dossier }) as RiskScore;

    insertSubmission({
      id: randomUUID(),
      fleetId,
      prospect: {
        legalName: label,
        heroFleetLabel: label,
        estimatedFleetSize: String(dossier.vehicles.length),
      },
      dossier,
      score,
      peerBenchmarks,
      apiTrace: [],
      consentSimulated: true,
    });

    console.log(` ${score.tier} (${Math.round(score.compositeScore)}/100) — ${ms}ms`);
    scored++;
  }

  // Seed claims
  console.log("\n  Seeding demo claims…");
  const CLAIM_PROFILES = [
    { claimNumber: "KS-2026-0142", driverProfile: "fewest_events" as const },
    { claimNumber: "KS-2026-0157", driverProfile: "most_events" as const },
  ];
  let claimsSeeded = 0;
  for (let i = 0; i < CLAIM_PROFILES.length; i++) {
    const { claimNumber, driverProfile } = CLAIM_PROFILES[i]!;
    if (getClaimByNumber(claimNumber)) {
      console.log(`  ✓ ${claimNumber} — already seeded`);
      continue;
    }
    const packet = await buildRealSingleIncidentPacket(claimNumber, { driverProfile });
    insertClaim({
      id: randomUUID(),
      claimNumber: packet.claimNumber,
      fleetId: heroIds[i] ?? "demo",
      status: "open",
      incidentAt: packet.incidentAt,
      incidentLocation: packet.incidentLocation,
      driverName: packet.driverName,
      vehicleUnit: packet.vehicleUnit,
      dataCompleteness: packet.dataCompleteness.status,
      incidentPacket: packet,
    });
    console.log(`  ✓ ${claimNumber} seeded (${driverProfile}) — data: ${packet.dataCompleteness.status}`);
    claimsSeeded++;
  }

  // Print checklist
  const allSubmissions = db.prepare("SELECT COUNT(*) as n FROM submissions").get() as { n: number };
  const claimsDb = getClaimsDb();
  const allClaims = claimsDb.prepare("SELECT COUNT(*) as n FROM claims").get() as { n: number };

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Demo ready — Keystone Risk Workbench

  Submissions in DB : ${allSubmissions.n} (${scored} newly scored)
  Claims in DB      : ${allClaims.n} (${claimsSeeded} newly seeded)

Demo flow:
  1. / ................... Landing — live Catena stats
  2. /portfolio ........... Portfolio view — all scored fleets
  3. /underwriting/new .... New submission — pick a hero fleet
  4. /underwriting/[id] ... Risk report — Export PDF
  5. /dispatch ............ Fleet operations — real HOS, safety events
  6. /claims .............. Claims Intelligence dashboard
  7. /claims/[id] ......... Defense packet — Export PDF
  8. /roi ................. ROI calculator (grounded in live fleet data)
  9. /tech ................ Architecture overview

Demo claims (live Catena API data):
  KS-2026-0142 → Real driver, fewest safety events (lower-risk profile)
  KS-2026-0157 → Real driver, most safety events (higher-risk profile)

Good luck!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((e) => {
  console.error("❌ Rehearsal failed:", e);
  process.exit(1);
});
