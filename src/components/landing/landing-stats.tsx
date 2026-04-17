import { Activity, Database, Truck, Users } from "lucide-react";
import { fetchLandingStats } from "@/lib/catena/landing-stats";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function freshnessClass(level: "good" | "warn" | "stale") {
  if (level === "good") return "text-success";
  if (level === "warn") return "text-warning";
  return "text-danger";
}

export async function LandingStatsTiles() {
  try {
    const s = await fetchLandingStats();
    const fresh = s.freshness;
    const level: "good" | "warn" | "stale" = fresh?.level ?? "warn";

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insured fleets</CardTitle>
            <Truck className="text-muted-foreground h-4 w-4" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="metric-tabular text-2xl font-semibold">{s.totalFleets}</div>
            <p className="text-muted-foreground text-xs">All fleets visible to this credential</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active vehicles</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="metric-tabular text-2xl font-semibold">
              {s.activeVehicles ?? "—"}
            </div>
            <p className="text-muted-foreground text-xs">From analytics overview</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active drivers</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="metric-tabular text-2xl font-semibold">
              {s.activeDrivers ?? "—"}
            </div>
            <p className="text-muted-foreground text-xs">From analytics overview</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data sync</CardTitle>
            <Database className="text-muted-foreground h-4 w-4" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className={`metric-tabular text-2xl font-semibold ${freshnessClass(level)}`}>
              {fresh?.label ?? "—"}
            </div>
            <p className="text-muted-foreground text-xs">
              Synthetic freshness from connections (sample fleet)
            </p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connected ELD integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="metric-tabular text-2xl font-semibold">{s.eldProviderCount}</div>
            <p className="text-muted-foreground text-xs">TSP integrations (paginated count)</p>
          </CardContent>
        </Card>
      </div>
    );
  } catch (e) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load live stats</AlertTitle>
        <AlertDescription>
          {e instanceof Error ? e.message : "Check CATENA_* environment variables and network access."}
        </AlertDescription>
      </Alert>
    );
  }
}
