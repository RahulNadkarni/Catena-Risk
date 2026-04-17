/**
 * Portfolio-level analytics fetched from the Catena API.
 * Used by the Portfolio dashboard (/portfolio).
 *
 * Live API calls:
 *   - getAnalyticsOverview()         → KPI strip (vehicles, drivers)
 *   - listFleetSummaries()           → per-fleet telematics activity rows
 *   - getFleetGrowthTimeSeries()     → 30-day fleet-count trend
 *   - getDriverGrowthTimeSeries()    → 30-day driver-count trend
 */

import { createCatenaClientFromEnv } from "@/lib/catena/client";

export interface PortfolioOverview {
  totalVehicles: number | null;
  totalDrivers: number | null;
  totalFleets: number;
}

export interface GrowthPoint {
  date: string;
  value: number;
}

export interface PortfolioTimeSeries {
  fleetGrowth: GrowthPoint[];
  driverGrowth: GrowthPoint[];
}

export interface FleetSummaryRow {
  fleetId: string;
  name: string | null;
  vehicleCount: number | null;
  driverCount: number | null;
  safetyEventCount: number | null;
}

function safeNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseGrowthSeries(raw: unknown): GrowthPoint[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  // Catena returns { items: [{period_start, count}, ...] } or similar
  const items =
    Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.data)
        ? obj.data
        : Array.isArray(obj.results)
          ? obj.results
          : [];
  return (items as unknown[]).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const date =
      typeof row.period_start === "string"
        ? row.period_start.slice(0, 10)
        : typeof row.date === "string"
          ? row.date.slice(0, 10)
          : null;
    const value =
      row.fleet_count != null
        ? safeNum(row.fleet_count)
        : row.driver_count != null
          ? safeNum(row.driver_count)
          : row.count != null
            ? safeNum(row.count)
            : row.value != null
              ? safeNum(row.value)
              : null;
    if (!date || value == null) return [];
    return [{ date, value }];
  });
}

export async function fetchPortfolioOverview(): Promise<PortfolioOverview> {
  const client = createCatenaClientFromEnv();
  const [overview, fleetPage] = await Promise.all([
    client.getAnalyticsOverview(),
    client.listFleets({ size: 1 }),
  ]);

  // Count all fleets
  let totalFleets = fleetPage.items?.length ?? 0;
  let cursor = fleetPage.next_page;
  while (typeof cursor === "string" && cursor.length > 0) {
    const next = await client.listFleets({ size: 100, cursor });
    totalFleets += next.items?.length ?? 0;
    cursor = typeof next.next_page === "string" && next.next_page.length > 0 ? next.next_page : undefined;
  }

  const ov = overview && typeof overview === "object" ? (overview as Record<string, unknown>) : {};
  return {
    totalVehicles: safeNum(ov.vehicles),
    totalDrivers: safeNum(ov.drivers),
    totalFleets,
  };
}

export async function fetchPortfolioTimeSeries(): Promise<PortfolioTimeSeries> {
  const client = createCatenaClientFromEnv();
  const [fleetTs, driverTs] = await Promise.all([
    client.getFleetGrowthTimeSeries().catch(() => null),
    client.getDriverGrowthTimeSeries().catch(() => null),
  ]);
  return {
    fleetGrowth: parseGrowthSeries(fleetTs),
    driverGrowth: parseGrowthSeries(driverTs),
  };
}

export async function fetchFleetSummaryRows(): Promise<FleetSummaryRow[]> {
  const client = createCatenaClientFromEnv();
  const [summaries, fleets] = await Promise.all([
    client.listFleetSummaries({ size: 50 }).catch(() => ({ items: [] })),
    client.listFleets({ size: 50 }),
  ]);

  const nameMap = new Map<string, string>();
  for (const f of fleets.items ?? []) {
    const displayName =
      (typeof f.name === "string" && f.name) ||
      (typeof f.display_name === "string" && f.display_name) ||
      f.fleet_ref ||
      f.id;
    nameMap.set(f.id, displayName);
  }

  return (summaries.items ?? []).map((row: unknown) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const fleetId = typeof r.fleet_id === "string" ? r.fleet_id : "";
    return {
      fleetId,
      name: nameMap.get(fleetId) ?? (typeof r.name === "string" ? r.name : null),
      vehicleCount: safeNum(r.vehicle_count ?? r.vehicles),
      driverCount: safeNum(r.driver_count ?? r.drivers),
      safetyEventCount: safeNum(r.safety_event_count ?? r.safety_events),
    };
  });
}
