import { NewClaimForm } from "@/components/claims/new-claim-form";

export const runtime = "nodejs";

export default function NewClaimPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New claim</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Select a demo scenario or enter custom claim details to generate a defense packet.
        </p>
      </div>
      <NewClaimForm />
    </div>
  );
}
