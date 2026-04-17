import { createCatenaClientFromEnv } from "@/lib/catena/client";

export interface PortfolioFleetRow {
  fleetId: string;
  name: string;
  fleetRef: string | null;
  updatedAt: string | null;
}

/**
 * Portfolio table uses org fleets (stable names) instead of loose analytics rows.
 */
export async function fetchPortfolioFleets(limit = 12): Promise<PortfolioFleetRow[]> {
  const client = createCatenaClientFromEnv();
  const page = await client.listFleets({ size: limit });
  return page.items.map((f) => ({
    fleetId: f.id,
    name:
      (typeof f.name === "string" && f.name.length > 0
        ? f.name
        : typeof f.display_name === "string" && f.display_name.length > 0
          ? f.display_name
          : null) ?? f.fleet_ref ?? f.id,
    fleetRef: f.fleet_ref ?? null,
    updatedAt: f.updated_at ?? null,
  }));
}
