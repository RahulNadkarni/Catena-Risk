/**
 * Hero fleets are HARDCODED fixture JSON bundles (pre-materialized dossiers for
 * specific sandbox fleets) that anchor the peer cohort shown in the risk report.
 *
 * Why hardcoded: there is no Catena API that returns "here are comparable peer
 * fleets for underwriting benchmarking" — peer cohort construction is a
 * downstream modelling concern (size × commodity × geography × operation type).
 * In production this would be replaced by an internal peer-cohort service
 * (e.g. `GET /underwriting/peers?fleet_size=...&commodity=...`) that returns a
 * live cohort, not committed fixture JSON.
 */
import fs from "node:fs/promises";
import path from "node:path";

const FIXTURES_DIR = path.join(process.cwd(), "src/lib/fixtures/fleets");

export async function listHeroFleetIds(): Promise<string[]> {
  const names = await fs.readdir(FIXTURES_DIR);
  const ids: string[] = [];
  for (const n of names) {
    if (!n.endsWith(".json")) continue;
    const text = await fs.readFile(path.join(FIXTURES_DIR, n), "utf8");
    const doc = JSON.parse(text) as { fleet_id?: string };
    if (typeof doc.fleet_id === "string") ids.push(doc.fleet_id);
  }
  return ids;
}

/** Display labels for hero fleets (fixture filenames carry rank; avoids N+1 getFleet on load). */
export async function listHeroFleetOptions(): Promise<{ id: string; label: string }[]> {
  const names = await fs.readdir(FIXTURES_DIR);
  const out: { id: string; label: string }[] = [];
  for (const n of names) {
    if (!n.endsWith(".json")) continue;
    const rankMatch = /^fleet-rank-(\d+)-/i.exec(n);
    const rank = rankMatch?.[1] ?? "?";
    const text = await fs.readFile(path.join(FIXTURES_DIR, n), "utf8");
    const doc = JSON.parse(text) as { fleet_id?: string };
    if (typeof doc.fleet_id === "string") {
      out.push({
        id: doc.fleet_id,
        label: `Sandbox fleet rank ${rank}`,
      });
    }
  }
  out.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  return out;
}
