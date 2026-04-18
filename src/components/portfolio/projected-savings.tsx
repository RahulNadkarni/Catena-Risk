import { TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PortfolioFleetRow } from "@/components/portfolio/fleet-table";

/**
 * Demo assumptions — would be parameterized from the carrier's rating plan and
 * historical loss-ratio data in a production deployment.
 *
 *  - Premium per power unit: directional industry mid-point for commercial auto
 *    (small/mid fleet, mixed long-haul + regional). Real carriers plug in their
 *    own book-weighted average from filings.
 *  - Loss-ratio lift per 10-pt score improvement on at-risk fleets: a conservative
 *    read of the telematics-intervention literature (see Lytx, Zendrive, Samsara
 *    whitepapers). Again, directional — real figure depends on carrier book mix.
 */
const ASSUMED_PREMIUM_PER_POWER_UNIT = 8_500;
const ASSUMED_LR_LIFT_PER_10PT_SCORE = 0.02;

export interface ProjectedSavingsProps {
  rows: PortfolioFleetRow[];
  totalActiveVehicles: number | null;
}

export function ProjectedSavingsTile({ rows, totalActiveVehicles }: ProjectedSavingsProps) {
  const deteriorating = rows.filter((r) => r.delta != null && r.delta < -10);
  const totalScored = rows.length;

  const avgVehiclesPerFleet =
    totalActiveVehicles != null && totalScored > 0
      ? totalActiveVehicles / totalScored
      : null;

  // We size intervention upside by average score drop on deteriorating fleets,
  // not a flat 10 pts — a fleet that dropped 25 points has more recoverable
  // loss cost than one that dropped 12. Assumption: a coached fleet recovers
  // half of the deterioration in the next renewal window.
  const avgDelta =
    deteriorating.length > 0
      ? deteriorating.reduce((s, r) => s + (r.delta ?? 0), 0) / deteriorating.length
      : 0;
  const recoverablePts = Math.min(20, Math.abs(avgDelta) * 0.5);
  const lrLift = (recoverablePts / 10) * ASSUMED_LR_LIFT_PER_10PT_SCORE;

  const projectedDollars =
    avgVehiclesPerFleet != null
      ? Math.round(
          deteriorating.length *
            avgVehiclesPerFleet *
            ASSUMED_PREMIUM_PER_POWER_UNIT *
            lrLift,
        )
      : null;

  const headline =
    projectedDollars != null
      ? projectedDollars >= 1_000_000
        ? `$${(projectedDollars / 1_000_000).toFixed(1)}M`
        : `$${Math.round(projectedDollars / 1_000).toLocaleString()}k`
      : "—";

  const subtitle =
    deteriorating.length > 0
      ? `${deteriorating.length} fleet${deteriorating.length === 1 ? "" : "s"} with >10-pt score drop · recover ~${recoverablePts.toFixed(0)} pts via coaching`
      : "No deteriorating fleets — book is stable";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Projected loss-cost at risk</CardTitle>
        <TrendingDown
          className={`h-4 w-4 ${deteriorating.length > 0 ? "text-amber-600" : "text-muted-foreground"}`}
          aria-hidden
        />
      </CardHeader>
      <CardContent>
        <Tooltip>
          <TooltipTrigger className="cursor-help text-left">
            <div className="metric-tabular text-2xl font-semibold">{headline}</div>
            <p className="text-muted-foreground text-xs">{subtitle}</p>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm text-xs">
            <p className="font-medium">How this is computed</p>
            <p className="mt-1">
              Deteriorating fleets ({deteriorating.length}) × avg vehicles per fleet
              {avgVehiclesPerFleet != null
                ? ` (${avgVehiclesPerFleet.toFixed(0)})`
                : " (n/a)"}{" "}
              × $
              {ASSUMED_PREMIUM_PER_POWER_UNIT.toLocaleString()} premium per power unit ×{" "}
              {(lrLift * 100).toFixed(1)}% recoverable loss-ratio (half of the avg{" "}
              {Math.abs(avgDelta).toFixed(0)}-pt drop).
            </p>
            <p className="mt-2 text-muted-foreground">
              Premium/unit and loss-ratio lift are directional demo constants; a
              production deployment reads these from the carrier rating plan.
            </p>
          </TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
}
