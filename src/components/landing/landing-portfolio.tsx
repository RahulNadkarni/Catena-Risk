import Link from "next/link";
import { fetchPortfolioFleets } from "@/lib/catena/portfolio";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function LandingPortfolioTable() {
  try {
    const rows = await fetchPortfolioFleets(12);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fleet portfolio</CardTitle>
          <CardDescription>Recent org fleets. Risk score column reserved for cached scores.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fleet</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead className="text-right">Risk score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.fleetId}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/underwriting/new?fleet=${encodeURIComponent(r.fleetId)}`}
                      className="text-primary hover:underline"
                    >
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground metric-tabular">{r.fleetRef ?? "—"}</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
