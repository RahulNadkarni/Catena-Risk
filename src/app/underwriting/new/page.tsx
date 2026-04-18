import { listHeroFleetOptions } from "@/lib/underwriting/hero-fleets";
import { UnderwritingWizard } from "@/components/underwriting/underwriting-wizard";

export const runtime = "nodejs";

export default async function NewUnderwritingPage({
  searchParams,
}: {
  searchParams: { fleet?: string | string[] };
}) {
  const fleetParam = typeof searchParams.fleet === "string" ? searchParams.fleet : undefined;
  const options = await listHeroFleetOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New underwriting submission</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pick the prospect fleet, request read-only telematics consent, and pull a 30-day dossier
          for scoring.
        </p>
      </div>
      <UnderwritingWizard heroFleetOptions={options} initialFleetId={fleetParam} />
    </div>
  );
}
