"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SpeedSample, ClaimSafetyEvent } from "@/lib/claims/types";

interface Props {
  speedTimeline: SpeedSample[];
  postedSpeedLimitMph: number | null;
  speedAtImpactMph: number;
  safetyEvents: ClaimSafetyEvent[];
}

const SEVERITY_COLOR: Record<string, string> = {
  high: "#dc2626",
  medium: "#f59e0b",
  low: "#facc15",
};

const EVENT_LABEL: Record<string, string> = {
  hard_brake: "Hard brake",
  harsh_corner: "Harsh corner",
  speeding: "Speeding",
  distraction: "Distraction",
  forward_collision: "FCW",
};

function formatOffset(minutes: number): string {
  if (minutes === 0) return "Impact";
  return `T${minutes}m`;
}

export function IncidentTimelineChart({ speedTimeline, postedSpeedLimitMph, speedAtImpactMph, safetyEvents }: Props) {
  const isOverLimit = postedSpeedLimitMph != null && speedAtImpactMph > postedSpeedLimitMph;
  const lineColor = isOverLimit ? "#dc2626" : "#0f766e";
  const limitForDomain = postedSpeedLimitMph ?? speedAtImpactMph;
  const maxSpeed = Math.max(...speedTimeline.map((s) => s.speedMph), limitForDomain + 5);

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={speedTimeline} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="offsetMinutes"
            tickFormatter={formatOffset}
            interval="preserveStartEnd"
            tick={{ fontSize: 11 }}
            label={{ value: "Minutes relative to impact", position: "insideBottom", offset: -2, fontSize: 11 }}
          />
          <YAxis
            domain={[0, Math.ceil(maxSpeed / 10) * 10 + 10]}
            tick={{ fontSize: 11 }}
            label={{ value: "mph", angle: -90, position: "insideLeft", fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)} mph`, "Speed"]}
            labelFormatter={(label) => `T${label}min`}
          />

          {/* Speed limit reference — only when available */}
          {postedSpeedLimitMph != null && (
            <ReferenceLine
              y={postedSpeedLimitMph}
              stroke="#dc2626"
              strokeDasharray="6 3"
              label={{ value: `Limit ${postedSpeedLimitMph}`, position: "insideTopRight", fontSize: 10, fill: "#dc2626" }}
            />
          )}

          {/* Impact moment */}
          <ReferenceLine
            x={0}
            stroke="#f97316"
            strokeWidth={2}
            label={{ value: "IMPACT", position: "top", fontSize: 10, fill: "#f97316" }}
          />

          {/* Safety event markers */}
          {safetyEvents.map((evt) => (
            <ReferenceLine
              key={evt.id}
              x={evt.offsetMinutes}
              stroke={SEVERITY_COLOR[evt.severity] ?? "#888"}
              strokeDasharray="4 2"
              label={{ value: EVENT_LABEL[evt.type] ?? evt.type, position: "top", fontSize: 9, fill: SEVERITY_COLOR[evt.severity] }}
            />
          ))}

          <Line
            type="monotone"
            dataKey="speedMph"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
