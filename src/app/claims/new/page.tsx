import { NewClaimForm } from "@/components/claims/new-claim-form";

export const runtime = "nodejs";

export default async function NewClaimPage({
  searchParams,
}: {
  searchParams: { claimNumber?: string; driverId?: string };
}) {
  const sp = searchParams;
  const defaultClaimNumber = sp.claimNumber ?? "";
  const fromDriverId = sp.driverId ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New claim</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {fromDriverId
            ? "Incident report pre-filled from dispatch — Catena API will pull live ELD, HOS, DVIR, weather, and road data."
            : "Enter a claim number to pull telematics, HOS, DVIR, weather, and road data from Catena."}
        </p>
      </div>
      <NewClaimForm
        defaultClaimNumber={defaultClaimNumber}
        fromDispatch={!!fromDriverId}
        dispatchVehicleId={fromDriverId ?? undefined}
      />
    </div>
  );
}
