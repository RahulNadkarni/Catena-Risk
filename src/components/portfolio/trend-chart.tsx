"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { PortfolioTimeSeries } from "@/lib/catena/portfolio-analytics";

interface Props {
  timeSeries: PortfolioTimeSeries;
}

// Merge fleet and driver growth points by date
function mergePoints(ts: PortfolioTimeSeries) {
  const map = new Map<string, { date: string; fleets?: number; drivers?: number }>();
  for (const p of ts.fleetGrowth) {
    map.set(p.date, { date: p.date, fleets: p.value });
  }
  for (const p of ts.driverGrowth) {
    const existing = map.get(p.date) ?? { date: p.date };
    map.set(p.date, { ...existing, drivers: p.value });
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function fmtDate(d: string) {
  try {
    return format(new Date(d), "MMM d");
  } catch {
    return d;
  }
}

export function PortfolioTrendChart({ timeSeries }: Props) {
  const data = mergePoints(timeSeries);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Growth time series not available for this sandbox org. Data populates as Catena ingests telematics history.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis yAxisId="fleet" tick={{ fontSize: 10 }} width={32} />
          <YAxis yAxisId="driver" orientation="right" tick={{ fontSize: 10 }} width={36} />
          <Tooltip
            formatter={(value, name) => [value, name === "fleets" ? "Fleets" : "Drivers"]}
            labelFormatter={(label) => fmtDate(String(label))}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            yAxisId="fleet"
            type="monotone"
            dataKey="fleets"
            stroke="#0f766e"
            strokeWidth={2}
            dot={false}
            name="Fleets"
          />
          <Line
            yAxisId="driver"
            type="monotone"
            dataKey="drivers"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            name="Drivers"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
