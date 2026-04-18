"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Database, MapPin } from "lucide-react";
import { createClaim } from "@/app/actions/claims";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  defaultClaimNumber?: string;
  fromDispatch?: boolean;
  dispatchVehicleId?: string;
}

export function NewClaimForm({ defaultClaimNumber = "", fromDispatch = false, dispatchVehicleId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimNumber, setClaimNumber] = useState(defaultClaimNumber);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claimNumber.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createClaim({
        claimNumber: claimNumber.trim(),
        dispatchVehicleId: dispatchVehicleId,
      });
      router.push(`/claims/${result.claimId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pull incident data from Catena API");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New evidence report</CardTitle>
        <CardDescription>
          {fromDispatch
            ? "Claim number pre-filled from dispatch. Catena API will fetch ELD, HOS, DVIR, weather, and road data for the driver on record."
            : "Enter a claim number to pull real telematics, HOS, DVIR, weather, and road data from Catena."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {fromDispatch && (
            <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 flex items-start gap-3 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-orange-600" />
              <div className="space-y-0.5">
                <p className="font-medium text-orange-900">From dispatch</p>
                <p className="text-orange-800 text-xs">
                  Claim number auto-generated from driver ID and today&apos;s date. Submit to pull a full telematics evidence packet from the Catena API.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="claimNumber">Claim number</Label>
            <Input
              id="claimNumber"
              value={claimNumber}
              onChange={(e) => setClaimNumber(e.target.value)}
              placeholder="KS-2026-XXXX"
              required
            />
          </div>

          <div className="rounded-md border bg-muted/40 px-4 py-3 flex items-start gap-3 text-sm">
            <Database className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Live Catena API</p>
              <p>Driver selected by highest safety event count. Speed, HOS, DVIR, and location pulled directly from ELD records. NOAA weather and OSM road context appended at incident coordinates. SHA-256 manifest generated for chain of custody.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !claimNumber.trim()}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Pulling from Catena…
                </>
              ) : (
                "Create evidence report"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
