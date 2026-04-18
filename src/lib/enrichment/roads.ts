/**
 * OSM Overpass enrichment — road context at incident location.
 *
 * Queries the Overpass API for the nearest way containing a maxspeed tag
 * and the road classification (highway=*) at the given lat/lng.
 *
 * OSM data is © OpenStreetMap contributors (ODbL). No API key required.
 */

import type { RoadContext } from "@/lib/claims/types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const TIMEOUT_MS = 15_000;
const SEARCH_RADIUS_M = 100;

type OverpassElement = {
  type: "way" | "node" | "relation";
  id: number;
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

const OSM_HIGHWAY_CLASSIFICATION: Record<string, RoadContext["roadClassification"]> = {
  motorway: "motorway",
  motorway_link: "motorway",
  trunk: "trunk",
  trunk_link: "trunk",
  primary: "primary",
  primary_link: "primary",
  secondary: "secondary",
  secondary_link: "secondary",
  tertiary: "tertiary",
  tertiary_link: "tertiary",
  residential: "residential",
  living_street: "residential",
  service: "service",
  unclassified: "unknown",
};

function parseSpeedLimit(raw: string | undefined): number | null {
  if (!raw) return null;
  // "55 mph" or "55" (assume mph in US) or "88 km/h"
  const mph = raw.match(/^(\d+)\s*mph$/i);
  if (mph) return parseInt(mph[1]!, 10);
  const kmh = raw.match(/^(\d+)\s*(km\/h|kmh|kph)?$/i);
  if (kmh) {
    const val = parseInt(kmh[1]!, 10);
    // If no unit and value > 100, assume km/h (US limits rarely exceed 85 mph)
    if (!kmh[2] && val <= 100) return val; // likely mph already (US Overpass)
    if (!kmh[2] && val > 100) return Math.round(val / 1.60934);
    return Math.round(val / 1.60934); // explicit km/h → mph
  }
  return null;
}

/** Reverse geocode a lat/lng to "City, State" using OSM Nominatim (free, no key). */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Catena-Risk/1.0 (insurance-telematics-demo)" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { address?: Record<string, string | undefined> };
    const a = data.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.county;
    const state = a.state;
    if (!city && !state) return null;
    return [city, state].filter(Boolean).join(", ");
  } catch {
    return null;
  }
}

export async function fetchRoadContext(
  lat: number,
  lng: number,
  inferredAddress?: string | null,
): Promise<RoadContext> {
  const fetchedAt = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const unavailable = (note?: string): RoadContext => ({
    source: "unavailable",
    fetchedAt,
    postedSpeedLimitMph: null,
    roadName: null,
    roadClassification: null,
    inferredAddress: inferredAddress ?? null,
    osmWayId: null,
  });

  // Overpass QL: find all ways within SEARCH_RADIUS_M that are driveable roads
  const query = `
[out:json][timeout:10];
(
  way(around:${SEARCH_RADIUS_M},${lat.toFixed(6)},${lng.toFixed(6)})
    ["highway"~"motorway|trunk|primary|secondary|tertiary|residential|living_street|service|unclassified"];
);
out tags;
`.trim();

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

    const data = (await res.json()) as OverpassResponse;
    const ways = data.elements.filter((e) => e.type === "way" && e.tags?.highway);

    if (!ways.length) return unavailable("No driveable way found within 100m");

    // Prefer ways with maxspeed tag; fall back to first way
    const withSpeed = ways.filter((w) => w.tags?.maxspeed);
    const best = withSpeed[0] ?? ways[0]!;
    const tags = best.tags ?? {};

    const rawSpeed = tags["maxspeed"];
    const postedSpeedLimitMph = parseSpeedLimit(rawSpeed);
    const highwayType = tags["highway"] ?? "";
    const roadClassification = OSM_HIGHWAY_CLASSIFICATION[highwayType] ?? "unknown";
    const roadName = tags["name"] ?? tags["ref"] ?? null;

    return {
      source: "osm",
      fetchedAt,
      postedSpeedLimitMph,
      roadName,
      roadClassification,
      inferredAddress: inferredAddress ?? null,
      osmWayId: String(best.id),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return unavailable(`OSM fetch failed: ${msg}`);
  }
}
