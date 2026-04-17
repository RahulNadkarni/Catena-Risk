import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = "nodejs";

export default function DriverDrillPlaceholderPage({
  params,
}: {
  params: { submissionId: string; driverId: string };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver drill</CardTitle>
        <CardDescription>
          Submission {params.submissionId} · Driver {params.driverId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Detailed driver timelines, HOS charts, and safety event replay will land here. For now, return to the risk
          report for roster context.
        </p>
        <Link href={`/underwriting/${params.submissionId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Back to report
        </Link>
      </CardContent>
    </Card>
  );
}
