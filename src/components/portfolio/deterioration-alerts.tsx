import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioFleetRow } from "@/components/portfolio/fleet-table";

interface Props {
  rows: PortfolioFleetRow[];
}

export function DeteriorationAlerts({ rows }: Props) {
  const alerts = rows.filter((r) => r.delta != null && r.delta < -10);

  return (
    <Card className={alerts.length > 0 ? "border-amber-300 bg-amber-50/50" : undefined}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${alerts.length > 0 ? "text-amber-600" : "text-muted-foreground"}`} aria-hidden />
          <CardTitle className="text-base">Deterioration alerts</CardTitle>
          {alerts.length > 0 && (
            <Badge className="bg-amber-500 text-white text-xs">{alerts.length}</Badge>
          )}
        </div>
        <CardDescription>
          Fleets whose risk score dropped &gt;10 points since last scoring — loss control priority list.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fleets with score deterioration &gt;10 points. Portfolio is stable.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((row) => (
              <li key={row.submissionId} className="flex items-center justify-between rounded-md border border-amber-200 bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-amber-700">
                    Score dropped {Math.abs(row.delta!).toFixed(0)} pts — now {Math.round(row.score.compositeScore)}/100 ({row.score.tier})
                  </p>
                </div>
                <Link
                  href={`/underwriting/${row.submissionId}`}
                  className="text-xs text-primary hover:underline"
                >
                  View →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
