import type { SafetyEventTypeBreakdown } from "@/lib/catena/fleet-risk";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-pink-500",
];

export function SafetyEventBreakdownCard({ breakdown }: { breakdown: SafetyEventTypeBreakdown[] }) {
  const total = breakdown.reduce((s, b) => s + b.count, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Safety event mix (30d)</CardTitle>
          <CardDescription>No safety events recorded in the last 30 days.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Safety event mix (30d)</CardTitle>
        <CardDescription>
          {total} total events · from <code className="text-xs">listDriverSafetyEvents</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stacked bar */}
        <div className="flex h-3 rounded-full overflow-hidden mb-4">
          {breakdown.map((b, i) => {
            const pct = (b.count / total) * 100;
            return (
              <div
                key={b.type}
                className={COLORS[i % COLORS.length]}
                style={{ width: `${pct}%` }}
                title={`${b.type}: ${b.count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        {/* Legend */}
        <div className="space-y-1.5">
          {breakdown.map((b, i) => {
            const pct = ((b.count / total) * 100).toFixed(1);
            return (
              <div key={b.type} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-sm ${COLORS[i % COLORS.length]}`} />
                  <span className="capitalize">{b.type}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="tabular-nums">{b.count}</span>
                  <span className="tabular-nums text-xs">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
