import { createCatenaClientFromEnv } from "@/lib/catena/client";
import { getConnectionFreshnessSummary } from "@/lib/catena/freshness";

export interface LandingStats {
  totalFleets: number;
  activeVehicles: number | null;
  activeDrivers: number | null;
  freshness: Awaited<ReturnType<typeof getConnectionFreshnessSummary>> | null;
  eldProviderCount: number;
}

async function countAllFleets(): Promise<number> {
  const client = createCatenaClientFromEnv();
  let total = 0;
  let cursor: string | undefined;
  do {
    const page = await client.listFleets({ size: 100, cursor });
    total += page.items?.length ?? 0;
    const next = page.next_page;
    cursor = typeof next === "string" && next.length > 0 ? next : undefined;
  } while (cursor);
  return total;
}

export async function fetchLandingStats(): Promise<LandingStats> {
  const client = createCatenaClientFromEnv();
  const firstFleetPage = await client.listFleets({ size: 1 });
  const fleetIdForFreshness = firstFleetPage.items[0]?.id;

  const [totalFleets, overview, tspPage] = await Promise.all([
    countAllFleets(),
    client.getAnalyticsOverview(),
    client.listIntegrationsTsps({ size: 200 }),
  ]);

  const activeVehicles =
    overview && typeof overview === "object" && "vehicles" in overview
      ? Number((overview as Record<string, unknown>).vehicles)
      : null;
  const activeDrivers =
    overview && typeof overview === "object" && "drivers" in overview
      ? Number((overview as Record<string, unknown>).drivers)
      : null;

  let tspCount = tspPage.items?.length ?? 0;
  let cursor = tspPage.next_page;
  while (typeof cursor === "string" && cursor.length > 0) {
    const next = await client.listIntegrationsTsps({ size: 200, cursor });
    tspCount += next.items?.length ?? 0;
    cursor = typeof next.next_page === "string" && next.next_page.length > 0 ? next.next_page : undefined;
  }

  let freshness: LandingStats["freshness"] = null;
  if (fleetIdForFreshness) {
    try {
      freshness = await getConnectionFreshnessSummary(client, fleetIdForFreshness);
    } catch {
      freshness = null;
    }
  } else {
    freshness = { lastSyncedMsAgo: null, label: "No fleet context", level: "warn" };
  }

  return {
    totalFleets,
    activeVehicles: Number.isFinite(activeVehicles ?? NaN) ? activeVehicles : null,
    activeDrivers: Number.isFinite(activeDrivers ?? NaN) ? activeDrivers : null,
    freshness,
    eldProviderCount: tspCount,
  };
}
