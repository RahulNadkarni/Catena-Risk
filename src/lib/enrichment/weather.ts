/**
 * NOAA Weather API enrichment
 *
 * Uses api.weather.gov — a free US federal API requiring no key.
 * Returns conditions at the incident lat/lng for the incident timestamp.
 * NOAA records are self-authenticating under FRE 902 as official government
 * records, requiring no expert foundation witness for admissibility.
 *
 * Flow:
 *   1. GET /points/{lat},{lng}           → resolve grid point + nearest stations URL
 *   2. GET /stations (sorted by distance) → pick closest reporting station
 *   3. GET /stations/{id}/observations   → find observation nearest to incident time
 */

import type { WeatherContext } from "@/lib/claims/types";

const NOAA_BASE = "https://api.weather.gov";
const TIMEOUT_MS = 10_000;

type NoaaPoint = {
  properties: {
    observationStations: string;
    gridId: string;
    gridX: number;
    gridY: number;
    relativeLocation?: { properties?: { city?: string; state?: string } };
  };
};

type NoaaStation = {
  properties: {
    stationIdentifier: string;
    name: string;
  };
  geometry?: { coordinates?: [number, number] }; // [lng, lat]
};

type NoaaObservation = {
  properties: {
    timestamp: string;
    temperature?: { value: number | null; unitCode: string };
    visibility?: { value: number | null; unitCode: string };
    windSpeed?: { value: number | null; unitCode: string };
    presentWeather?: { intensity: string | null; weather: string | null }[];
    rawMessage?: string;
  };
};

async function noaaGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Catena-Risk/1.0 (insurance-telematics)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`NOAA ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function celsiusToF(c: number): number {
  return c * 1.8 + 32;
}

function metersPerSecToMph(mps: number): number {
  return mps * 2.237;
}

function metersToMiles(m: number): number {
  return m / 1609.344;
}

function classifyPrecip(
  weatherCodes: { weather: string | null; intensity: string | null }[],
): WeatherContext["precipitationType"] {
  for (const w of weatherCodes) {
    const s = (w.weather ?? "").toLowerCase();
    const i = (w.intensity ?? "").toLowerCase();
    if (!s || s === "null") continue;
    if (s.includes("snow") || s.includes("blizzard")) return "snow";
    if (s.includes("freezing") || s.includes("ice") || s.includes("sleet")) return "freezing_rain";
    if (s.includes("rain") || s.includes("drizzle") || s.includes("showers")) return "rain";
    if (i && i !== "null") return "rain"; // catch-all intensity present
  }
  return "none";
}

function precipToRoadCondition(
  precip: WeatherContext["precipitationType"],
  tempF: number | null,
): WeatherContext["roadCondition"] {
  if (precip === "snow" || precip === "freezing_rain") return "icy";
  if (precip === "rain") return tempF != null && tempF <= 32 ? "icy" : "wet";
  if (precip === "none") return "dry";
  return "unknown";
}

/** Fetch weather conditions at a lat/lng for a given UTC timestamp (ISO 8601). */
export async function fetchWeatherAtIncident(
  lat: number,
  lng: number,
  incidentAt: string,
): Promise<WeatherContext> {
  const fetchedAt = new Date().toISOString();
  const unavailable = (note?: string): WeatherContext => ({
    source: "unavailable",
    fetchedAt,
    stationId: null,
    stationName: null,
    stationDistanceKm: null,
    temperatureF: null,
    visibilityMiles: null,
    windSpeedMph: null,
    precipitationType: null,
    precipitationIntensityInHr: null,
    roadCondition: "unknown",
    conditionDescription: note ?? "NOAA data unavailable",
    rawObservationUrl: null,
  });

  try {
    // Step 1: resolve grid point
    const pointUrl = `${NOAA_BASE}/points/${lat.toFixed(4)},${lng.toFixed(4)}`;
    const point = await noaaGet<NoaaPoint>(pointUrl);
    const stationsUrl = point.properties.observationStations;

    // Step 2: get nearest stations (response is a GeoJSON FeatureCollection)
    const stationsResp = await noaaGet<{ features: NoaaStation[] }>(stationsUrl + "?limit=5");
    const stations = stationsResp.features;
    if (!stations.length) return unavailable("No NOAA stations found near incident location");

    // Pick station closest to incident lat/lng
    let bestStation = stations[0]!;
    let bestDist = Infinity;
    for (const st of stations) {
      const [sLng, sLat] = st.geometry?.coordinates ?? [lng, lat];
      const d = haversineKm(lat, lng, sLat!, sLng!);
      if (d < bestDist) {
        bestDist = d;
        bestStation = st;
      }
    }

    const stationId = bestStation.properties.stationIdentifier;
    const stationName = bestStation.properties.name;

    // Step 3: fetch observations for the incident day window
    const incidentDate = new Date(incidentAt);
    const startIso = new Date(incidentDate.getTime() - 2 * 3600_000).toISOString();
    const endIso = new Date(incidentDate.getTime() + 1 * 3600_000).toISOString();
    const obsUrl = `${NOAA_BASE}/stations/${stationId}/observations?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}&limit=10`;

    const obsResp = await noaaGet<{ features: NoaaObservation[] }>(obsUrl);
    const observations = obsResp.features;

    // Find observation closest in time to incident
    let bestObs: NoaaObservation | null = null;
    let bestTimeDiff = Infinity;
    for (const obs of observations) {
      const obsTime = new Date(obs.properties.timestamp).getTime();
      const diff = Math.abs(obsTime - incidentDate.getTime());
      if (diff < bestTimeDiff) {
        bestTimeDiff = diff;
        bestObs = obs;
      }
    }

    if (!bestObs) return unavailable(`No NOAA observations within 3h of incident at station ${stationId}`);

    const p = bestObs.properties;
    const tempC = p.temperature?.value ?? null;
    const temperatureF = tempC != null ? Math.round(celsiusToF(tempC) * 10) / 10 : null;
    const visM = p.visibility?.value ?? null;
    const visibilityMiles = visM != null ? Math.round(metersToMiles(visM) * 10) / 10 : null;
    const windMps = p.windSpeed?.value ?? null;
    const windSpeedMph = windMps != null ? Math.round(metersPerSecToMph(windMps) * 10) / 10 : null;
    const precipCodes = p.presentWeather ?? [];
    const precipitationType = classifyPrecip(precipCodes);
    const roadCondition = precipToRoadCondition(precipitationType, temperatureF);

    const conditionParts: string[] = [];
    if (temperatureF != null) conditionParts.push(`${temperatureF}°F`);
    if (visibilityMiles != null) conditionParts.push(`visibility ${visibilityMiles} mi`);
    if (windSpeedMph != null) conditionParts.push(`wind ${windSpeedMph} mph`);
    if (precipitationType && precipitationType !== "none") conditionParts.push(precipitationType);

    return {
      source: "noaa",
      fetchedAt,
      stationId,
      stationName,
      stationDistanceKm: Math.round(bestDist * 10) / 10,
      temperatureF,
      visibilityMiles,
      windSpeedMph,
      precipitationType,
      precipitationIntensityInHr: null, // NOAA synoptic obs doesn't give hourly precip amount directly
      roadCondition,
      conditionDescription: conditionParts.join(", ") || "Conditions recorded",
      rawObservationUrl: obsUrl,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return unavailable(`NOAA fetch failed: ${msg}`);
  }
}
