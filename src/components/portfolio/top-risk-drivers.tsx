import Link from "next/link";
import type { TopDriverRisk } from "@/lib/catena/fleet-risk";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function displayName(d: TopDriverRisk): string {
  const first = d.firstName;
  const last = d.lastName;
  const isSynthetic = !first || first.startsWith("Driver_") || first.startsWith("driver_");
  if (isSynthetic && d.username && !d.username.startsWith("user_")) {
    return d.username.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return `${first ?? "Driver"} ${last ?? d.driverId.slice(0, 6)}`;
}

export function TopRiskDriversCard({ drivers }: { drivers: TopDriverRisk[] }) {
  if (drivers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top-risk drivers (30d)</CardTitle>
          <CardDescription>No drivers with recent safety events or HOS violations.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top-risk drivers (30d)</CardTitle>
        <CardDescription>
          From <code className="text-xs">GET /v2/telematics/analytics/drivers</code> · ranked by events + 2× HOS violations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {drivers.map((d, i) => (
            <Link
              key={d.driverId}
              href={`/portfolio/drivers/${encodeURIComponent(d.driverId)}`}
              className="flex items-center justify-between gap-3 border-b border-border/40 py-1.5 last:border-0 hover:bg-muted/40 -mx-2 px-2 rounded transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-muted-foreground tabular-nums shrink-0 w-5 text-right text-xs">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-primary">{displayName(d)}</p>
                  {d.rulesetCode && (
                    <p className="text-xs text-muted-foreground font-mono truncate">{d.rulesetCode}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs">
                  {d.safetyEvents30d} events
                </Badge>
                {d.hosViolations30d > 0 && (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-200 text-xs">
                    {d.hosViolations30d} viol
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
