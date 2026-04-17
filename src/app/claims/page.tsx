import Link from "next/link";
import { ClaimsTable } from "@/components/claims/claims-table";
import { listClaims } from "@/app/actions/claims";
import { buttonVariants } from "@/components/ui/button";

export const runtime = "nodejs";

export default async function ClaimsDashboardPage() {
  const claims = await listClaims();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Claims Intelligence</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Defense packet generation and litigation risk assessment powered by Catena telematics.
          </p>
        </div>
        <Link href="/claims/new" className={buttonVariants()}>
          New claim
        </Link>
      </div>

      <ClaimsTable claims={claims} />

      <p className="text-xs text-muted-foreground">
        Demo claims are synthetic data generated for demonstration purposes only. Run{" "}
        <code className="font-mono">npm run seed:claims</code> if the table is empty.
      </p>
    </div>
  );
}
