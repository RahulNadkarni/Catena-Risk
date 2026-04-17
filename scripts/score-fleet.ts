/**
 * Peer-relative risk score + underwriter narrative for one fleet.
 * Peer cohort = all fleets found in `src/lib/fixtures/fleets/*.json` (hero bundle).
 *
 * Usage: `npx tsx scripts/score-fleet.ts <fleetId>`
 * Optional: `CATENA_SCORE_SOURCE=api` to pull dossiers from the API instead of fixtures.
 */
import "./load-env";
import fs from "node:fs/promises";
import path from "node:path";
import { buildFleetDossier } from "../src/lib/domain/fleet-dossier";
import { computeBehaviorRates, computeExposureMetrics } from "../src/lib/domain/derived-metrics";
import { buildUnderwriterNarrative } from "../src/lib/risk/explanations";
import { computePeerBenchmarks } from "../src/lib/risk/peer-benchmarks";
import { computeRiskScore } from "../src/lib/risk/scoring";

const fleetIdArg = process.argv[2];
if (!fleetIdArg) {
  // eslint-disable-next-line no-console
  console.error("Usage: npx tsx scripts/score-fleet.ts <fleetId>");
  process.exit(1);
}

const source = process.env.CATENA_SCORE_SOURCE === "api" ? "api" : "fixtures";

async function listFixtureFleetIds(): Promise<string[]> {
  const dir = path.join(process.cwd(), "src/lib/fixtures/fleets");
  const names = await fs.readdir(dir);
  const ids: string[] = [];
  for (const n of names) {
    if (!n.endsWith(".json")) continue;
    const text = await fs.readFile(path.join(dir, n), "utf8");
    ids.push((JSON.parse(text) as { fleet_id: string }).fleet_id);
  }
  return ids;
}

async function main() {
  const peerIds = await listFixtureFleetIds();
  if (!peerIds.length) {
    // eslint-disable-next-line no-console
    console.error("No fleet JSON fixtures under src/lib/fixtures/fleets/");
    process.exit(1);
  }
  if (!peerIds.includes(fleetIdArg)) {
    // eslint-disable-next-line no-console
    console.error(`Fleet ${fleetIdArg} not in fixture cohort. Known IDs:\n${peerIds.join("\n")}`);
    process.exit(1);
  }

  const peerDossiers = await Promise.all(peerIds.map((id) => buildFleetDossier(id, { source })));
  const target = peerDossiers.find((d) => d.fleetId === fleetIdArg)!;

  const peerBenchmarks = computePeerBenchmarks(peerDossiers);
  const exposure = computeExposureMetrics(target);
  const behaviorRates = computeBehaviorRates(target, exposure);

  const score = computeRiskScore({
    behaviorRates,
    exposure,
    peerBenchmarks,
    dossier: target,
  });

  const narrative = buildUnderwriterNarrative(score);

  // eslint-disable-next-line no-console
  console.log("=== Risk score ===\n");
  // eslint-disable-next-line no-console
  console.table({
    compositeScore: score.compositeScore.toFixed(2),
    tier: score.tier,
    confidence: score.confidence,
    dataWindowDays: score.dataWindowDays,
    computedAt: score.computedAt.toISOString(),
    peerCohortSize: String(peerDossiers.length),
  });

  // eslint-disable-next-line no-console
  console.log("\n=== Sub-scores ===\n");
  // eslint-disable-next-line no-console
  console.table(
    score.subScores.map((s) => ({
      category: s.category,
      rawValue: s.rawValue.toFixed(4),
      peerPct: s.peerPercentile.toFixed(1),
      subScore: s.subScore.toFixed(1),
      weight: s.weight,
      contribution: s.contributionToFinalScore.toFixed(3),
    })),
  );

  // eslint-disable-next-line no-console
  console.log("\n=== Top risk drivers (worst) ===\n");
  // eslint-disable-next-line no-console
  console.table(score.topRiskDrivers.map((s) => ({ category: s.category, subScore: s.subScore.toFixed(1) })));

  // eslint-disable-next-line no-console
  console.log("\n=== Top strengths ===\n");
  // eslint-disable-next-line no-console
  console.table(score.topStrengths.map((s) => ({ category: s.category, subScore: s.subScore.toFixed(1) })));

  // eslint-disable-next-line no-console
  console.log("\n=== Recommended action ===\n");
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(score.recommendedAction, null, 2));

  // eslint-disable-next-line no-console
  console.log("\n=== Underwriter narrative ===\n");
  // eslint-disable-next-line no-console
  console.log(narrative);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
