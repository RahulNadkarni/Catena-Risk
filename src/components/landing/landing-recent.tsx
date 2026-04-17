import Link from "next/link";
import { format } from "date-fns/format";
import { listRecentSubmissionsAction } from "@/app/actions/underwriting";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function LandingRecentSubmissions() {
  const rows = await listRecentSubmissionsAction();
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>No submissions yet. Start a new underwriting run.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest SQLite-backed submissions on this host.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/underwriting/${r.id}`}
            className="hover:bg-muted/80 flex flex-col rounded-lg border border-border p-3 transition"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{r.prospect.legalName ?? "Submission"}</span>
              <span className="text-muted-foreground metric-tabular text-xs">
                {format(new Date(r.created_at), "MMM d, HH:mm")}
              </span>
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap gap-2 text-xs">
              <span>Tier {r.score.tier}</span>
              <span>·</span>
              <span className="metric-tabular">Score {r.score.compositeScore.toFixed(1)}</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
