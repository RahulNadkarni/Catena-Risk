"use client";

import type { HosSnapshot } from "@/lib/claims/types";

const ROW_LABELS = ["Off duty", "Sleeper", "Driving", "On duty"];
const COL_WIDTH = 24;
const ROW_HEIGHT = 20;
const LABEL_WIDTH = 70;
const GRID_W = COL_WIDTH * 24;
const GRID_H = ROW_HEIGHT * 4;
const SVG_W = LABEL_WIDTH + GRID_W + 4;
const SVG_H = GRID_H + 32; // extra for hour labels below

function hourX(h: number) {
  return LABEL_WIDTH + h * COL_WIDTH;
}

function rowY(row: number) {
  return row * ROW_HEIGHT;
}

export function HosGrid({ snapshot }: { snapshot: HosSnapshot }) {
  const driveUsed = Math.min(snapshot.driveTimeUsedHours, 11);
  const driveLimit = 11;
  const atLimit = snapshot.hoursUntilDriveLimit <= 1;

  // Driving row is index 2
  const drivingRowY = rowY(2);
  const driveBarW = (driveUsed / driveLimit) * GRID_W;
  const remainingBarX = LABEL_WIDTH + driveBarW;
  const remainingBarW = GRID_W - driveBarW;

  // "Now" marker = end of drive used
  const nowX = LABEL_WIDTH + driveBarW;

  const hourTicks = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: "100%", maxWidth: SVG_W, height: "auto", minWidth: 400 }}
        aria-label="ELD duty status grid"
      >
        {/* Row labels */}
        {ROW_LABELS.map((label, i) => (
          <text
            key={label}
            x={LABEL_WIDTH - 4}
            y={rowY(i) + ROW_HEIGHT / 2 + 4}
            textAnchor="end"
            fontSize={9}
            fill="#6b7280"
          >
            {label}
          </text>
        ))}

        {/* Grid background */}
        <rect x={LABEL_WIDTH} y={0} width={GRID_W} height={GRID_H} fill="#f9fafb" stroke="#e5e7eb" strokeWidth={0.5} />

        {/* Horizontal row lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={LABEL_WIDTH}
            y1={rowY(i)}
            x2={LABEL_WIDTH + GRID_W}
            y2={rowY(i)}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}

        {/* Vertical hour lines */}
        {hourTicks.map((h) => (
          <line
            key={h}
            x1={hourX(h)}
            y1={0}
            x2={hourX(h)}
            y2={GRID_H}
            stroke="#e5e7eb"
            strokeWidth={h % 6 === 0 ? 1 : 0.5}
          />
        ))}

        {/* Driving bar — used portion */}
        <rect
          x={LABEL_WIDTH}
          y={drivingRowY + 2}
          width={driveBarW}
          height={ROW_HEIGHT - 4}
          fill={atLimit ? "#dc2626" : "#0f766e"}
          rx={2}
        />

        {/* Driving bar — remaining portion */}
        <rect
          x={remainingBarX}
          y={drivingRowY + 2}
          width={remainingBarW}
          height={ROW_HEIGHT - 4}
          fill="#d1fae5"
          rx={2}
        />

        {/* "Now" marker line */}
        <line
          x1={nowX}
          y1={0}
          x2={nowX}
          y2={GRID_H}
          stroke="#f97316"
          strokeWidth={2}
          strokeDasharray="3 2"
        />
        <text x={nowX + 2} y={10} fontSize={8} fill="#f97316" fontWeight="bold">
          Now
        </text>

        {/* Hour labels */}
        {[0, 6, 12, 18, 24].map((h) => (
          <text key={h} x={hourX(h)} y={GRID_H + 14} textAnchor="middle" fontSize={9} fill="#9ca3af">
            {h}:00
          </text>
        ))}

        {/* Bottom label */}
        <text x={LABEL_WIDTH + GRID_W / 2} y={GRID_H + 28} textAnchor="middle" fontSize={9} fill="#9ca3af">
          Hours (24h window)
        </text>
      </svg>

      {/* Summary row */}
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          Drive:{" "}
          <span className={`font-semibold ${atLimit ? "text-destructive" : "text-foreground"}`}>
            {snapshot.driveTimeUsedHours.toFixed(1)}h used / {snapshot.driveTimeLimitHours}h
          </span>
        </span>
        <span>
          Cycle:{" "}
          <span className={`font-semibold ${snapshot.hoursUntilCycleLimit <= 1 ? "text-destructive" : "text-foreground"}`}>
            {snapshot.cycleUsedHours.toFixed(1)}h used / {snapshot.cycleLimitHours}h
          </span>
        </span>
        <span>
          Remaining drive time:{" "}
          <span className={`font-semibold ${atLimit ? "text-destructive" : "text-success"}`}>
            {snapshot.hoursUntilDriveLimit.toFixed(1)}h
          </span>
        </span>
      </div>
    </div>
  );
}
