"use client";

import { useMemo } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import type { RouteWaypoint, SyntheticFuelStop } from "@/lib/claims/types";
import "leaflet/dist/leaflet.css";

interface Props {
  routeWaypoints: RouteWaypoint[];
  incidentLat: number;
  incidentLng: number;
  fuelStops: SyntheticFuelStop[];
  speedLimitMph: number;
}

function segmentColor(speedMph: number, limitMph: number): string {
  if (speedMph > limitMph + 5) return "#dc2626"; // red — speeding
  if (speedMph > limitMph - 5) return "#f59e0b"; // amber — near limit
  return "#0f766e"; // teal — safe
}

export default function ClaimMap({ routeWaypoints, incidentLat, incidentLng, fuelStops, speedLimitMph }: Props) {
  // Group consecutive waypoints of the same color into single Polylines for performance
  const polylineGroups = useMemo(() => {
    if (routeWaypoints.length < 2) return [];
    const groups: { positions: [number, number][]; color: string }[] = [];
    let current: [number, number][] = [[routeWaypoints[0]!.lat, routeWaypoints[0]!.lng]];
    let currentColor = segmentColor(routeWaypoints[0]!.speedMph, speedLimitMph);

    for (let i = 1; i < routeWaypoints.length; i++) {
      const wp = routeWaypoints[i]!;
      const color = segmentColor(wp.speedMph, speedLimitMph);
      current.push([wp.lat, wp.lng]);
      if (color !== currentColor || i === routeWaypoints.length - 1) {
        groups.push({ positions: current, color: currentColor });
        current = [[wp.lat, wp.lng]];
        currentColor = color;
      }
    }
    return groups;
  }, [routeWaypoints, speedLimitMph]);

  const bounds = useMemo((): [[number, number], [number, number]] | null => {
    const allLats = routeWaypoints.map((w) => w.lat).concat(incidentLat);
    const allLngs = routeWaypoints.map((w) => w.lng).concat(incidentLng);
    if (allLats.length === 0) return null;
    const pad = 0.05;
    return [
      [Math.min(...allLats) - pad, Math.min(...allLngs) - pad],
      [Math.max(...allLats) + pad, Math.max(...allLngs) + pad],
    ];
  }, [routeWaypoints, incidentLat, incidentLng]);

  return (
    <MapContainer
      className="h-[400px] w-full rounded-lg border border-border [&_.leaflet-control-attribution]:text-[10px]"
      bounds={bounds ?? undefined}
      center={bounds ? undefined : [incidentLat, incidentLng]}
      zoom={bounds ? undefined : 8}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Route segments colored by speed */}
      {polylineGroups.map((g, i) => (
        <Polyline key={i} positions={g.positions} pathOptions={{ color: g.color, weight: 3, opacity: 0.8 }} />
      ))}

      {/* Incident location pin */}
      <CircleMarker
        center={[incidentLat, incidentLng]}
        radius={10}
        pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.9 }}
      >
        <Popup>
          <span className="text-xs font-semibold">Incident location</span>
        </Popup>
      </CircleMarker>

      {/* Fuel stops */}
      {fuelStops.map((stop) => (
        <CircleMarker
          key={stop.id}
          center={[stop.lat, stop.lng]}
          radius={6}
          pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.75 }}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-medium">{stop.locationName}</p>
              <p>{stop.gallons.toFixed(1)} gal @ ${stop.pricePerGallon.toFixed(2)}/gal</p>
              <p className="text-muted-foreground">(Synthetic — API unavailable)</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
