/**
 * Builds offline JSON fixtures from ./exploration/*.json (run `npm run explore:api` first).
 *
 * Fleet ranking: sum of `raw.items` row counts across exploration files where each item
 * includes a `fleet_id` UUID — a simple proxy for "how much telematics volume references this fleet".
 */
import "./load-env";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXPLORATION_DIR = path.join(ROOT, "exploration");
const FIXTURES_DIR = path.join(ROOT, "src", "lib", "fixtures");

function extractItems(raw: unknown): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.items)) return o.items;
  if (Array.isArray(o.data)) return o.data;
  return [];
}

type Agg = {
  score: number;
  vehicles: unknown[];
  users: unknown[];
  safety: unknown[];
  hosEvents: unknown[];
  dvirLogs: unknown[];
  locations: unknown[];
};

async function main() {
  const names = await fs.readdir(EXPLORATION_DIR);
  const jsonFiles = names.filter((n) => n.endsWith(".json") && n !== "package.json");

  const byFleet = new Map<string, Agg>();

  const add = (fleetId: string, bucket: keyof Omit<Agg, "score">, rows: unknown[]) => {
    if (!fleetId) return;
    let a = byFleet.get(fleetId);
    if (!a) {
      a = {
        score: 0,
        vehicles: [],
        users: [],
        safety: [],
        hosEvents: [],
        dvirLogs: [],
        locations: [],
      };
      byFleet.set(fleetId, a);
    }
    a.score += rows.length;
    const cap = 200;
    const target = a[bucket];
    for (const r of rows) {
      if (target.length >= cap) break;
      target.push(r);
    }
  };

  try {
    const fleetsPath = path.join(EXPLORATION_DIR, "get_v2_orgs_fleets.json");
    const fleetsDoc = JSON.parse(await fs.readFile(fleetsPath, "utf8")) as { raw?: unknown };
    for (const it of extractItems(fleetsDoc.raw)) {
      if (!it || typeof it !== "object") continue;
      const id = (it as { id?: string }).id;
      if (typeof id === "string" && !byFleet.has(id)) {
        byFleet.set(id, {
          score: 0,
          vehicles: [],
          users: [],
          safety: [],
          hosEvents: [],
          dvirLogs: [],
          locations: [],
        });
      }
    }
  } catch {
    /* exploration not run yet */
  }

  for (const file of jsonFiles) {
    const full = path.join(EXPLORATION_DIR, file);
    const text = await fs.readFile(full, "utf8");
    let doc: { row?: { pathTemplate?: string }; raw?: unknown };
    try {
      doc = JSON.parse(text) as { row?: { pathTemplate?: string }; raw?: unknown };
    } catch {
      continue;
    }
    const pt = doc.row?.pathTemplate ?? "";
    const items = extractItems(doc.raw);
    if (!items.length) continue;

    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      const o = it as Record<string, unknown>;
      const fleetId = typeof o.fleet_id === "string" ? o.fleet_id : undefined;
      if (!fleetId) continue;

      if (pt.includes("/telematics/vehicles") && !pt.includes("vehicle_id")) add(fleetId, "vehicles", [it]);
      else if (pt.includes("/telematics/users")) add(fleetId, "users", [it]);
      else if (pt.includes("driver-safety-events")) add(fleetId, "safety", [it]);
      else if (pt.includes("/hos-events")) add(fleetId, "hosEvents", [it]);
      else if (pt.includes("/dvir-logs")) add(fleetId, "dvirLogs", [it]);
      else if (pt.includes("vehicle-locations") || pt.includes("live-locations"))
        add(fleetId, "locations", [it]);
      else add(fleetId, "vehicles", [it]);
    }
  }

  await fs.mkdir(path.join(FIXTURES_DIR, "fleets"), { recursive: true });
  await fs.mkdir(path.join(FIXTURES_DIR, "reference"), { recursive: true });

  const ranked = Array.from(byFleet.entries()).sort((a, b) => b[1].score - a[1].score);
  const top = ranked.slice(0, 5);

  if (!top.length) {
    // eslint-disable-next-line no-console
    console.warn("No fleet ids found in exploration output. Run `npm run explore:api` first.");
    return;
  }

  for (let i = 0; i < top.length; i++) {
    const [fleetId, agg] = top[i]!;
    const fname = `fleet-rank-${i + 1}-${fleetId.slice(0, 8)}.json`;
    await fs.writeFile(
      path.join(FIXTURES_DIR, "fleets", fname),
      JSON.stringify({ fleet_id: fleetId, ...agg }, null, 2),
    );
  }

  const refPrefixes = [
    "get_v2_telematics_ref_hos",
    "get_v2_telematics_ref_timezones",
  ];
  for (const file of jsonFiles) {
    if (!refPrefixes.some((p) => file.startsWith(p))) continue;
    const full = path.join(EXPLORATION_DIR, file);
    const text = await fs.readFile(full, "utf8");
    const doc = JSON.parse(text) as { raw?: unknown; row?: { pathTemplate?: string } };
    const outName = file.replace(/\.json$/, "").replace(/^get_v2_telematics_/, "") + ".json";
    await fs.writeFile(
      path.join(FIXTURES_DIR, "reference", outName),
      JSON.stringify({ sourcePath: doc.row?.pathTemplate, data: doc.raw }, null, 2),
    );
  }

  // eslint-disable-next-line no-console
  console.log("Wrote fixtures under", FIXTURES_DIR, "top fleets:", top.map((t) => t[0]));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
