/**
 * FMCSA SAFER Web API enrichment — carrier safety record at date of loss.
 *
 * Uses the FMCSA SAFER Web Services API. A free API key from FMCSA is required.
 * Set FMCSA_API_KEY in .env.local.
 *
 * Endpoint: https://mobile.fmcsa.dot.gov/qc/services/carriers/{dotNumber}
 *
 * Returns the carrier's safety rating, driver/vehicle counts, OOS rates,
 * and 24-month crash/injury/fatality totals — all from the federal MCMIS database.
 * This data is self-authenticating under FRE 902 as an official government record.
 */

import type { CarrierSafetyContext } from "@/lib/claims/types";

const FMCSA_BASE = "https://mobile.fmcsa.dot.gov/qc/services";
const TIMEOUT_MS = 10_000;

type FmcsaCarrier = {
  carrier?: {
    dotNumber?: string | number;
    legalName?: string;
    safetyRating?: string;
    totalDrivers?: number | string;
    totalPowerUnits?: number | string;
    // OOS rates from inspectionSummary are sometimes nested differently
    driverOosRate?: number | string;
    vehicleOosRate?: number | string;
    crashTotal?: number | string;
    fatalCrash?: number | string;
    injCrash?: number | string;
  };
  content?: {
    carrier?: FmcsaCarrier["carrier"];
  };
};

type FmcsaSafetyRating =
  | "satisfactory"
  | "conditional"
  | "unsatisfactory"
  | "not_rated";

function normalizeSafetyRating(raw: string | undefined): FmcsaSafetyRating {
  if (!raw) return "not_rated";
  const s = raw.toLowerCase().trim();
  if (s === "satisfactory") return "satisfactory";
  if (s === "conditional") return "conditional";
  if (s === "unsatisfactory") return "unsatisfactory";
  return "not_rated";
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function toRate(v: unknown): number | null {
  const n = toNum(v);
  if (n === null) return null;
  // FMCSA returns OOS rate as percentage (e.g. 12.5) — normalize to 0–1
  return n > 1 ? Math.round((n / 100) * 1000) / 1000 : Math.round(n * 1000) / 1000;
}

export async function fetchCarrierSafety(
  dotNumber: string,
  catenaTspSources: string[] = [],
): Promise<CarrierSafetyContext> {
  const fetchedAt = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const unavailable = (note?: string): CarrierSafetyContext => ({
    source: "unavailable",
    fetchedAt,
    dotNumber: dotNumber || null,
    carrierName: null,
    safetyRating: null,
    totalDrivers: null,
    totalPowerUnits: null,
    outOfServiceRateDrivers: null,
    outOfServiceRateVehicles: null,
    crashTotal24m: null,
    injuryTotal24m: null,
    fatalTotal24m: null,
    catenaTspSources,
  });

  const apiKey = process.env["FMCSA_API_KEY"];
  if (!apiKey) return unavailable("FMCSA_API_KEY not configured");
  if (!dotNumber) return unavailable("No DOT number available");

  // Strip any non-numeric prefix (e.g. "DOT-123456" → "123456")
  const dotClean = dotNumber.replace(/\D/g, "");
  if (!dotClean) return unavailable("Invalid DOT number format");

  const url = `${FMCSA_BASE}/carriers/${dotClean}?webKey=${apiKey}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 404) return unavailable(`No FMCSA record for DOT ${dotClean}`);
    if (!res.ok) throw new Error(`FMCSA HTTP ${res.status}`);

    const json = (await res.json()) as FmcsaCarrier;
    // Response shape varies — carrier may be at root or under content
    const c = json.carrier ?? json.content?.carrier;
    if (!c) return unavailable("Unexpected FMCSA response shape");

    return {
      source: "fmcsa",
      fetchedAt,
      dotNumber: dotClean,
      carrierName: c.legalName ?? null,
      safetyRating: normalizeSafetyRating(c.safetyRating),
      totalDrivers: toNum(c.totalDrivers),
      totalPowerUnits: toNum(c.totalPowerUnits),
      outOfServiceRateDrivers: toRate(c.driverOosRate),
      outOfServiceRateVehicles: toRate(c.vehicleOosRate),
      crashTotal24m: toNum(c.crashTotal),
      injuryTotal24m: toNum(c.injCrash),
      fatalTotal24m: toNum(c.fatalCrash),
      catenaTspSources,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return unavailable(`FMCSA fetch failed: ${msg}`);
  }
}
