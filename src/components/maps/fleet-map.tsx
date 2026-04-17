"use client";

import { useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { VehicleLocationRead } from "@/lib/catena/types";
import "leaflet/dist/leaflet.css";

function pickLatLng(loc: VehicleLocationRead): [number, number] | null {
  const r = loc as Record<string, unknown>;
  const lat = Number(r.latitude ?? r.lat);
  const lng = Number(r.longitude ?? r.lng ?? r.lon ?? r.long);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

export default function FleetMap({ locations }: { locations: VehicleLocationRead[] }) {
  const points = useMemo(() => {
    const out: [number, number][] = [];
    for (const l of locations) {
      const p = pickLatLng(l);
      if (p) out.push(p);
    }
    return out;
  }, [locations]);

  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const [lat, lng] of points) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
    const pad = points.length === 1 ? 0.35 : 0.05;
    return [
      [minLat - pad, minLng - pad],
      [maxLat + pad, maxLng + pad],
    ] as [[number, number], [number, number]];
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="bg-muted flex h-[320px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No latitude/longitude on vehicle location samples. Region polygons are unavailable in this tenant; map requires
        coordinate fields on pings.
      </div>
    );
  }

  const center = points[0]!;

  return (
    <MapContainer
      className="h-[320px] w-full rounded-lg border border-border [&_.leaflet-control-attribution]:text-[10px]"
      bounds={bounds ?? undefined}
      center={bounds ? undefined : center}
      zoom={bounds ? undefined : 6}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.slice(0, 400).map((p, i) => (
        <CircleMarker
          key={`${p[0]}-${p[1]}-${i}`}
          center={p}
          radius={4}
          pathOptions={{ color: "#0f766e", fillOpacity: 0.55 }}
        >
          <Popup>
            <span className="text-xs">
              {p[0].toFixed(4)}, {p[1].toFixed(4)}
            </span>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
