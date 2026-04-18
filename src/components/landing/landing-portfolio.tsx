import Link from "next/link";
import { fetchFleetRiskSummaries, type FleetRiskSummary } from "@/lib/catena/fleet-risk";
import { getPortfolioRows } from "@/app/actions/portfolio";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function indicatorBadge(ind: FleetRiskSummary["liveIndicator"]) {
  if (ind === "high") return <Badge className="bg-red-600 hover:bg-red-700">High</Badge>;
  if (ind === "medium") return <Badge className="bg-amber-500 hover:bg-amber-600">Medium</Badge>;
  if (ind === "low") return <Badge className="bg-emerald-600 hover:bg-emerald-700">Low</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">No data</Badge>;
}

// Color bands (>=75 red, >=50 amber) are HARDCODED dashboard heuristics for
// the landing page. Note this column is `events_per_vehicle × 25` (a live-risk
// proxy), not the composite score — so thresholds differ from the tier cutoffs
// in src/lib/risk/scoring.ts. In production both would come from the same
// internal risk-policy service.
function scoreLabel(score: number | null): { label: string; cls: string } {
  if (score == null) return { label: "—", cls: "text-muted-foreground" };
  if (score >= 75) return { label: score.toFixed(1), cls: "text-red-600 font-semibold" };
  if (score >= 50) return { label: score.toFixed(1), cls: "text-amber-600 font-semibold" };
  return { label: score.toFixed(1), cls: "text-emerald-700 font-semibold" };
}

export async function LandingPortfolioTable() {
  try {
    const [liveRisk, cachedRows] = await Promise.all([
      fetchFleetRiskSummaries(12),
      getPortfolioRows(),
    ]);

    // Index cached scores by fleet_id
    const cachedByFleet = new Map(cachedRows.map((r) => [r.fleetId, r]));

    return (
      <Card>
        <CardHeader>
          <CardTitle>Fleet portfolio</CardTitle>
          <CardDescription>
            Live risk indicators from Catena safety events &amp; HOS violations · cached composite scores from underwriting submissions
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fleet</TableHead>
                <TableHead className="text-right">Vehicles</TableHead>
                <TableHead className="text-right">Drivers</TableHead>
                <TableHead className="text-right">Events 30d</TableHead>
                <TableHead className="text-right">HOS viol</TableHead>
                <TableHead className="text-center">Live risk</TableHead>
                <TableHead className="text-right">Comp. score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liveRisk.map((r) => {
                const cached = cachedByFleet.get(r.fleetId);
                const score = cached?.score.compositeScore ?? null;
                const { label, cls } = scoreLabel(score);
                return (
                  <TableRow key={r.fleetId}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/portfolio/fleets/${encodeURIComponent(r.fleetId)}`}
                        className="text-primary hover:underline"
                      >
                        {r.name}
                      </Link>
                      {r.fleetRef && <span className="text-muted-foreground ml-1 text-xs">· {r.fleetRef}</span>}
                    </TableCell>
                    <TableCell className="text-right metric-tabular">{r.vehicleCount || "—"}</TableCell>
                    <TableCell className="text-right metric-tabular">{r.driverCount || "—"}</TableCell>
                    <TableCell className="text-right metric-tabular">{r.safetyEvents30d}</TableCell>
                    <TableCell className={`text-right metric-tabular ${r.hosViolations30d > 0 ? "text-red-600" : ""}`}>
                      {r.hosViolations30d}
                    </TableCell>
                    <TableCell className="text-center">{indicatorBadge(r.liveIndicator)}</TableCell>
                    <TableCell className={`text-right metric-tabular ${cls}`}>{label}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="text-muted-foreground mt-3 text-xs">
            Live risk tier: events/vehicle/month &lt;1 low, 1–3 medium, &gt;3 high · Comp. score from cached underwriting submissions (run <code>npm run rehearse</code> to score all).
          </p>
        </CardContent>
      </Card>
    );
  } catch (e) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Portfolio unavailable</AlertTitle>
        <AlertDescription>
          {e instanceof Error ? e.message : "Unable to list fleets."}
        </AlertDescription>
      </Alert>
    );
  }
}
