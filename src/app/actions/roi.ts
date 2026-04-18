"use server";

import { createCatenaClientFromEnv } from "@/lib/catena/client";

export interface FleetRoiMetrics {
  // Real API counts
  totalVehicles: number;
  totalDrivers: number;
  totalFleets: number;
  // Derived rates from real API data
  safetyEventsPerDriverMonth: number;  // from driver-safety-events count ÷ drivers ÷ months
  hosViolationsPerDriverMonth: number; // from hos-violations count ÷ drivers ÷ months
  dvirDefectRate: number;              // defective logs / total logs (pct 0-1)
  // Suggested ROI inputs derived from real rates
  suggestedClaimsPerYear: number;      // estimated from safety event rate
  suggestedLossRatioPct: number;       // 72 baseline, adjusted by real rates
  // Raw counts for transparency
  safetyEventCount30d: number;
  hosViolationCount30d: number;
  dvirLogCount: number;
  dataWindowDays: number;
}

function num(obj: unknown, key: string): number | null {
  if (!obj || typeof obj !== "object") return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(obj: unknown, key: string): string | null {
  if (!obj || typeof obj !== "object") return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" && v ? v : null;
}

export async function fetchFleetRoiMetrics(): Promise<FleetRoiMetrics> {
  const client = createCatenaClientFromEnv();
  const DATA_WINDOW_DAYS = 30;

  const [overviewRes, safetyRes, hosViolRes, dvirRes, usersRes] = await Promise.all([
    client.getAnalyticsOverview(),
    client.listDriverSafetyEvents({ size: 200 }),
    client.listHosViolations({ size: 200 }),
    client.listDvirLogs({ size: 200 }),
    client.listUsers({ size: 200 }),
  ]);

  // Fleet overview (real counts from analytics)
  const totalVehicles = num(overviewRes, "total_vehicles") ?? (overviewRes as Record<string, unknown>)?.active_vehicles as number ?? 0;
  const totalDrivers = num(overviewRes, "total_drivers") ?? num(overviewRes, "active_drivers") ?? (usersRes?.items?.length ?? 0);
  const totalFleets = 1; // sandbox is single-fleet

  const safetyEvents = (safetyRes?.items ?? []) as unknown[];
  const hosViolations = (hosViolRes?.items ?? []) as unknown[];
  const dvirLogs = (dvirRes?.items ?? []) as unknown[];
  const users = (usersRes?.items ?? []) as unknown[];

  const effectiveDrivers = Math.max(1, totalDrivers || users.length);
  const driverMonths = (effectiveDrivers * DATA_WINDOW_DAYS) / 30;

  const safetyEventCount30d = safetyEvents.length;
  const hosViolationCount30d = hosViolations.length;
  const dvirLogCount = dvirLogs.length;

  const safetyEventsPerDriverMonth = Math.round((safetyEventCount30d / driverMonths) * 10) / 10;
  const hosViolationsPerDriverMonth = Math.round((hosViolationCount30d / driverMonths) * 10) / 10;

  const defectiveLogs = dvirLogs.filter((l) => {
    const status = str(l, "condition");
    const defects = num(l, "defect_count");
    return status === "unsatisfactory" || (defects != null && defects > 0);
  }).length;
  const dvirDefectRate = dvirLogCount > 0 ? Math.round((defectiveLogs / dvirLogCount) * 1000) / 1000 : 0;

  // Heuristic ROI suggestions based on real rates vs industry baseline
  // Industry baseline: ~0.3 events/driver/month; ~0.15 violations/driver/month
  const safetyRiskRatio = safetyEventsPerDriverMonth / 0.3;
  const hosRiskRatio = hosViolationsPerDriverMonth / 0.15;

  // Suggest a loss ratio that's higher when rates are elevated (worse = more premium needed)
  const baseLossRatio = 72;
  const adjustedLossRatio = Math.min(90, Math.round(baseLossRatio + (safetyRiskRatio - 1) * 3 + (hosRiskRatio - 1) * 2));

  // Estimate annual claims: industry average ~1 claim per 3 drivers per year
  const suggestedClaimsPerYear = Math.round(effectiveDrivers / 3);

  return {
    totalVehicles,
    totalDrivers: effectiveDrivers,
    totalFleets,
    safetyEventsPerDriverMonth,
    hosViolationsPerDriverMonth,
    dvirDefectRate,
    suggestedClaimsPerYear,
    suggestedLossRatioPct: adjustedLossRatio,
    safetyEventCount30d,
    hosViolationCount30d,
    dvirLogCount,
    dataWindowDays: DATA_WINDOW_DAYS,
  };
}
