import type { CatenaClient } from "@/lib/catena/client";

export type FreshnessLevel = "good" | "warn" | "stale";

export interface ConnectionFreshnessSummary {
  lastSyncedMsAgo: number | null;
  label: string;
  level: FreshnessLevel;
}

/**
 * Synthetic data freshness: newest connection `updated_at` for the fleet vs now.
 * Replaces unavailable `getDataFreshness` public endpoint.
 */
export async function getConnectionFreshnessSummary(
  client: CatenaClient,
  fleetId: string,
): Promise<ConnectionFreshnessSummary> {
  const t0 = Date.now();
  const page = await client.listConnections({ size: 200 });
  const ms = Date.now() - t0;
  void ms;
  const rows = page.items.filter((c) => c.fleet_id === fleetId);
  if (!rows.length) {
    return {
      lastSyncedMsAgo: null,
      label: "No connections for fleet",
      level: "stale",
    };
  }
  let newest = 0;
  for (const r of rows) {
    const t = Date.parse(r.updated_at);
    if (Number.isFinite(t) && t > newest) newest = t;
  }
  if (!newest) {
    return { lastSyncedMsAgo: null, label: "Unknown sync time", level: "warn" };
  }
  const ago = Date.now() - newest;
  const min = Math.round(ago / 60000);
  const label =
    min < 1 ? "Last synced less than 1 minute ago" : `Last synced ${min} minute${min === 1 ? "" : "s"} ago`;
  let level: FreshnessLevel = "stale";
  if (ago < 15 * 60 * 1000) level = "good";
  else if (ago < 24 * 60 * 60 * 1000) level = "warn";
  return { lastSyncedMsAgo: ago, label, level };
}
