import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PortfolioKpiBand } from "@/components/portfolio/kpi-band";
import { RiskDistributionChart } from "@/components/portfolio/risk-distribution";
import { PortfolioTrendChart } from "@/components/portfolio/trend-chart";
import { PortfolioFleetTable } from "@/components/portfolio/fleet-table";
import { DeteriorationAlerts } from "@/components/portfolio/deterioration-alerts";
import { ProjectedSavingsTile } from "@/components/portfolio/projected-savings";
import { TopRiskDriversCard } from "@/components/portfolio/top-risk-drivers";
import { SafetyEventBreakdownCard } from "@/components/portfolio/event-breakdown";
import { fetchPortfolioOverview, fetchPortfolioTimeSeries } from "@/lib/catena/portfolio-analytics";
import { fetchTopRiskDrivers, fetchSafetyEventBreakdown } from "@/lib/catena/fleet-risk";
import { getPortfolioRows } from "@/app/actions/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const [overview, timeSeries, rows, topRiskDrivers, eventBreakdown] = await Promise.all([
    fetchPortfolioOverview(),
    fetchPortfolioTimeSeries(),
    getPortfolioRows(),
    fetchTopRiskDrivers(10),
    fetchSafetyEventBreakdown(),
  ]);

  const scores = rows.map((r) => r.score);
  const deteriorating = rows.filter((r) => r.delta != null && r.delta < -10);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio View</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Live Catena telematics across all connected fleets · Risk scores from underwriting submissions
        </p>
      </div>

      {/* KPI strip — live from Catena API */}
      <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" />}>
        <PortfolioKpiBand overview={overview} scores={scores} />
      </Suspense>

      {/* Loss-control lever — $ number the carrier can optimize against */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProjectedSavingsTile rows={rows} totalActiveVehicles={overview.totalVehicles} />
      </div>

      {/* Distribution + Trend side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk tier distribution</CardTitle>
            <CardDescription>Count of scored fleets by underwriting tier</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskDistributionChart scores={scores} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fleet & driver growth (30d)</CardTitle>
            <CardDescription>
              Live from Catena API — <code className="text-xs">getFleetGrowthTimeSeries</code> &amp; <code className="text-xs">getDriverGrowthTimeSeries</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortfolioTrendChart timeSeries={timeSeries} />
          </CardContent>
        </Card>
      </div>

      {/* Live driver + event analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopRiskDriversCard drivers={topRiskDrivers} />
        <SafetyEventBreakdownCard breakdown={eventBreakdown} />
      </div>

      <Separator />

      {/* Fleet table */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Fleet risk register</h2>
        <p className="text-muted-foreground text-sm">
          All scored fleets. Click any fleet to drill into the full underwriting report.
          Run <code className="font-mono text-xs">npm run rehearse</code> to pre-score all demo fleets.
        </p>
        <PortfolioFleetTable rows={rows} />
      </section>

      {/* Deterioration alerts */}
      {deteriorating.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Loss control priorities</h2>
          <DeteriorationAlerts rows={rows} />
        </section>
      )}
      {deteriorating.length === 0 && (
        <DeteriorationAlerts rows={rows} />
      )}

      <p className="text-xs text-muted-foreground pb-4">
        KPI band (vehicles, drivers, fleet count) pulled live from Catena Clearing API via{" "}
        <code className="font-mono">getAnalyticsOverview</code> and{" "}
        <code className="font-mono">listFleets</code>. Risk scores are computed locally from Catena telematics data and stored in SQLite.
        Growth time series via <code className="font-mono">getFleetGrowthTimeSeries</code> &amp;{" "}
        <code className="font-mono">getDriverGrowthTimeSeries</code>.
      </p>
    </div>
  );
}
