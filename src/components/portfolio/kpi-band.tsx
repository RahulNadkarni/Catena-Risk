"use client";

import type { PortfolioOverview } from "@/lib/catena/portfolio-analytics";
import type { RiskScore } from "@/lib/risk/scoring";

interface Props {
  overview: PortfolioOverview;
  scores: RiskScore[];
}

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "amber" | "red";
}) {
  const accentClass =
    accent === "green"
      ? "text-emerald-600"
      : accent === "red"
        ? "text-destructive"
        : accent === "amber"
          ? "text-amber-600"
          : "";
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <p className={`metric-tabular text-2xl font-semibold ${accentClass}`}>{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
    </div>
  );
}

export function PortfolioKpiBand({ overview, scores }: Props) {
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((s, x) => s + x.compositeScore, 0) / scores.length)
      : null;

  const preferredPct =
    scores.length > 0
      ? Math.round((scores.filter((s) => s.tier === "Preferred").length / scores.length) * 100)
      : null;

  const substandardPct =
    scores.length > 0
      ? Math.round(
          (scores.filter((s) => s.tier === "Substandard" || s.tier === "Decline").length /
            scores.length) *
            100,
        )
      : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Tile
        label="Active fleets"
        value={overview.totalFleets.toString()}
        sub="Catena-connected"
      />
      <Tile
        label="Active vehicles"
        value={overview.totalVehicles != null ? overview.totalVehicles.toLocaleString() : "—"}
        sub="Via Catena API"
      />
      <Tile
        label="Active drivers"
        value={overview.totalDrivers != null ? overview.totalDrivers.toLocaleString() : "—"}
        sub="Via Catena API"
      />
      {/* Score bands (>=80 green, >=65 neutral, else amber) and the 20%
          substandard-mix threshold are HARDCODED dashboard heuristics — same
          story as src/lib/risk/scoring.ts tier cutoffs. No Catena API serves
          portfolio health bands; production would read them from the same
          internal rating-policy service. */}
      <Tile
        label="Avg risk score"
        value={avgScore != null ? `${avgScore}/100` : "—"}
        sub={scores.length > 0 ? `${scores.length} scored fleet(s)` : "No scored fleets yet"}
        accent={
          avgScore != null ? (avgScore >= 80 ? "green" : avgScore >= 65 ? undefined : "amber") : undefined
        }
      />
      <Tile
        label="Tier mix"
        value={preferredPct != null ? `${preferredPct}% Pref` : "—"}
        sub={substandardPct != null ? `${substandardPct}% Sub/Decline` : undefined}
        accent={substandardPct != null && substandardPct > 20 ? "amber" : "green"}
      />
    </div>
  );
}
