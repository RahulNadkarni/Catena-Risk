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

export interface FixtureFleetSummary {
  fleetId: string;
  rank: number | null;
  /** Pre-computed risk score stored in the fixture bundle (0–1000 scale). */
  score: number | null;
  /** Counts from the fixture bundle. `vehicles` is post-partition (connections stripped). */
  counts: {
    vehicles: number;
    connections: number;
    users: number;
    safety: number;
    hosEvents: number;
    dvirLogs: number;
    locations: number;
  };
  /** Earliest vehicle/connection `created_at` — proxy for "fleet known since". */
  firstSeenAt: string | null;
  /** Most common `fleet_ref` across connection rows in the fixture. */
  fleetRef: string | null;
  /** Distinct `source_name` values observed on connection rows. */
  telematicsSources: string[];
}

interface RawFixture {
  fleet_id?: string;
  score?: number;
  vehicles?: unknown[];
  users?: unknown[];
  safety?: unknown[];
  hosEvents?: unknown[];
  dvirLogs?: unknown[];
  locations?: unknown[];
}

function looksLikeConnection(o: Record<string, unknown>): boolean {
  return (
    o.credentials !== undefined &&
    typeof o.credentials === "object" &&
    o.credentials !== null &&
    !("vehicle_name" in o) &&
    !("vin" in o)
  );
}

function summarizeFixture(doc: RawFixture, rank: number | null): FixtureFleetSummary {
  const vehiclesRaw = Array.isArray(doc.vehicles) ? doc.vehicles : [];
  let vehicleCount = 0;
  let connectionCount = 0;
  let firstSeen: string | null = null;
  const refCounts = new Map<string, number>();
  const sourceSet = new Set<string>();
  for (const r of vehiclesRaw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.magic_link === "string") continue;
    const createdAt = typeof o.created_at === "string" ? o.created_at : null;
    if (createdAt && (firstSeen === null || createdAt < firstSeen)) firstSeen = createdAt;
    if (looksLikeConnection(o)) {
      connectionCount += 1;
      const ref = typeof o.fleet_ref === "string" ? o.fleet_ref : null;
      if (ref) refCounts.set(ref, (refCounts.get(ref) ?? 0) + 1);
      const src = typeof o.source_name === "string" ? o.source_name : null;
      if (src) sourceSet.add(src);
    } else if (o.vehicle_name != null || o.vin != null || o.connection_id != null) {
      vehicleCount += 1;
    }
  }
  let topRef: string | null = null;
  let topRefCount = 0;
  for (const [ref, n] of refCounts) {
    if (n > topRefCount) {
      topRefCount = n;
      topRef = ref;
    }
  }

  return {
    fleetId: typeof doc.fleet_id === "string" ? doc.fleet_id : "",
    rank,
    score: typeof doc.score === "number" && Number.isFinite(doc.score) ? doc.score : null,
    counts: {
      vehicles: vehicleCount,
      connections: connectionCount,
      users: Array.isArray(doc.users) ? doc.users.length : 0,
      safety: Array.isArray(doc.safety) ? doc.safety.length : 0,
      hosEvents: Array.isArray(doc.hosEvents) ? doc.hosEvents.length : 0,
      dvirLogs: Array.isArray(doc.dvirLogs) ? doc.dvirLogs.length : 0,
      locations: Array.isArray(doc.locations) ? doc.locations.length : 0,
    },
    firstSeenAt: firstSeen,
    fleetRef: topRef,
    telematicsSources: [...sourceSet],
  };
}

async function readAllFixtureSummaries(): Promise<FixtureFleetSummary[]> {
  const names = await fs.readdir(FIXTURES_DIR);
  const out: FixtureFleetSummary[] = [];
  for (const n of names) {
    if (!n.endsWith(".json")) continue;
    const rankMatch = /^fleet-rank-(\d+)-/i.exec(n);
    const rank = rankMatch ? Number(rankMatch[1]) : null;
    const text = await fs.readFile(path.join(FIXTURES_DIR, n), "utf8");
    const doc = JSON.parse(text) as RawFixture;
    if (typeof doc.fleet_id !== "string") continue;
    out.push(summarizeFixture(doc, rank));
  }
  return out;
}

export async function listHeroFleetIds(): Promise<string[]> {
  const summaries = await readAllFixtureSummaries();
  return summaries.map((s) => s.fleetId);
}

export async function getFixtureFleetSummary(fleetId: string): Promise<FixtureFleetSummary | null> {
  const summaries = await readAllFixtureSummaries();
  return summaries.find((s) => s.fleetId === fleetId) ?? null;
}

export interface HeroFleetOption {
  id: string;
  label: string;
  fixture: FixtureFleetSummary | null;
}

/** Target-fleet dropdown options. Pulled live from the sandbox via
 *  `listFleets` so the selected fleet_id actually exists when downstream calls
 *  (`listDriverSafetyEvents`, etc.) pass it back to Catena. For fleet_ids that
 *  match a hero fixture we enrich the label with the fixture's pre-computed
 *  risk score — otherwise the dropdown shows raw UUIDs which is useless. */
export async function listHeroFleetOptions(): Promise<HeroFleetOption[]> {
  const { createCatenaClientFromEnv } = await import("@/lib/catena/client");
  const [page, fixtures] = await Promise.all([
    createCatenaClientFromEnv().listFleets({ size: 50 }),
    readAllFixtureSummaries(),
  ]);
  const fixtureByFleet = new Map(fixtures.map((f) => [f.fleetId, f]));
  const items = (page?.items ?? []) as Array<Record<string, unknown>>;
  const out: HeroFleetOption[] = [];
  for (const f of items) {
    const id = typeof f.id === "string" ? f.id : null;
    if (!id) continue;
    const fixture = fixtureByFleet.get(id) ?? null;
    const name =
      (typeof f.name === "string" && f.name) ||
      (typeof f.display_name === "string" && f.display_name) ||
      null;
    const fleetRef =
      (typeof f.fleet_ref === "string" && f.fleet_ref) || fixture?.fleetRef || null;
    const parts: string[] = [];
    if (name) parts.push(name);
    else if (fixture?.rank != null) parts.push(`Hero fleet #${fixture.rank}`);
    else parts.push(`Fleet ${id.slice(0, 8)}`);
    if (fleetRef) parts.push(fleetRef);
    if (fixture?.counts.vehicles != null && fixture.counts.vehicles > 0) {
      parts.push(`${fixture.counts.vehicles} vehicles`);
    }
    if (fixture?.score != null) parts.push(`score ${fixture.score}`);
    out.push({ id, label: parts.join(" · "), fixture });
  }
  out.sort((a, b) => {
    // Hero fleets with a known rank come first, then everything else alphabetically.
    const ra = a.fixture?.rank ?? Number.POSITIVE_INFINITY;
    const rb = b.fixture?.rank ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return a.label.localeCompare(b.label);
  });
  return out;
}
