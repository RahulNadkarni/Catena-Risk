"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClaim } from "@/app/actions/claims";
import type { ScenarioId } from "@/lib/claims/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SCENARIOS: { value: string; label: string }[] = [
  { value: "", label: "Custom entry (blank fields)" },
  {
    value: "KS-2026-0142",
    label: "KS-2026-0142 — Rear-end collision, I-80 NE (Exonerating)",
  },
  {
    value: "KS-2026-0157",
    label: "KS-2026-0157 — Lane change incident, I-95 NJ (Inculpating)",
  },
];

const SCENARIO_DEFAULTS: Record<ScenarioId, { claimNumber: string; incidentAt: string; incidentLocation: string; driverName: string; vehicleUnit: string }> = {
  "KS-2026-0142": {
    claimNumber: "KS-2026-0142",
    incidentAt: "2026-03-14T14:22",
    incidentLocation: "I-80 westbound MM 312, Kearney NE",
    driverName: "Marcus T. Walcott",
    vehicleUnit: "Unit 2841",
  },
  "KS-2026-0157": {
    claimNumber: "KS-2026-0157",
    incidentAt: "2026-03-21T09:47",
    incidentLocation: "I-95 northbound MM 11.2, Woodbridge NJ",
    driverName: "Devon R. Castillo",
    vehicleUnit: "Unit 1174",
  },
};

export function NewClaimForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scenarioId, setScenarioId] = useState<string>("");
  const [claimNumber, setClaimNumber] = useState("");
  const [incidentAt, setIncidentAt] = useState("");
  const [incidentLocation, setIncidentLocation] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleUnit, setVehicleUnit] = useState("");

  function handleScenarioChange(val: string) {
    setScenarioId(val);
    if (val === "" ) {
      setClaimNumber("");
      setIncidentAt("");
      setIncidentLocation("");
      setDriverName("");
      setVehicleUnit("");
      return;
    }
    const defaults = SCENARIO_DEFAULTS[val as ScenarioId];
    if (defaults) {
      setClaimNumber(defaults.claimNumber);
      setIncidentAt(defaults.incidentAt);
      setIncidentLocation(defaults.incidentLocation);
      setDriverName(defaults.driverName);
      setVehicleUnit(defaults.vehicleUnit);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await createClaim({
        claimNumber: claimNumber || `KS-${Date.now()}`,
        scenarioId: (scenarioId as ScenarioId) || undefined,
        incidentAt: incidentAt ? new Date(incidentAt).toISOString() : undefined,
        incidentLocation: incidentLocation || undefined,
        driverName: driverName || undefined,
        vehicleUnit: vehicleUnit || undefined,
      });
      router.push(`/claims/${result.claimId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate defense packet");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim details</CardTitle>
        <CardDescription>
          Select a demo scenario to pre-fill fields, or enter custom claim information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {error ? (
            <div className="sm:col-span-2">
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="scenario">Demo scenario</Label>
            <select
              id="scenario"
              className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={scenarioId}
              onChange={(e) => handleScenarioChange(e.target.value)}
            >
              {SCENARIOS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">
              Selecting a demo scenario pre-fills all fields with synthetic incident data.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="claimNumber">Claim ID</Label>
            <Input
              id="claimNumber"
              value={claimNumber}
              onChange={(e) => setClaimNumber(e.target.value)}
              placeholder="KS-2026-XXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="incidentAt">Incident date/time</Label>
            <Input
              id="incidentAt"
              type="datetime-local"
              value={incidentAt}
              onChange={(e) => setIncidentAt(e.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="incidentLocation">Incident location</Label>
            <Input
              id="incidentLocation"
              value={incidentLocation}
              onChange={(e) => setIncidentLocation(e.target.value)}
              placeholder="I-80 westbound MM 312, Kearney NE"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driverName">Driver name</Label>
            <Input
              id="driverName"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleUnit">Vehicle unit</Label>
            <Input
              id="vehicleUnit"
              value={vehicleUnit}
              onChange={(e) => setVehicleUnit(e.target.value)}
              placeholder="Unit 2841"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Generating defense packet…
                </>
              ) : (
                "Generate defense packet"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
