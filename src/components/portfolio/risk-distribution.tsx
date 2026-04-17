"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RiskScore } from "@/lib/risk/scoring";

const TIER_ORDER = ["Preferred", "Standard", "Substandard", "Decline"] as const;
const TIER_COLOR: Record<string, string> = {
  Preferred: "#059669",
  Standard: "#2563eb",
  Substandard: "#d97706",
  Decline: "#dc2626",
};

interface Props {
  scores: RiskScore[];
}

export function RiskDistributionChart({ scores }: Props) {
  const counts = Object.fromEntries(TIER_ORDER.map((t) => [t, 0]));
  for (const s of scores) {
    if (s.tier in counts) counts[s.tier]++;
  }
  const data = TIER_ORDER.map((tier) => ({ tier, count: counts[tier] }));

  if (scores.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No scored fleets. Run <code className="mx-1 font-mono text-xs">npm run rehearse</code> to score all demo fleets.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
          <Tooltip formatter={(v) => [v, "Fleets"]} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.tier} fill={TIER_COLOR[entry.tier] ?? "#888"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
