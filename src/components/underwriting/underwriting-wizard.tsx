"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, Loader2, Shield } from "lucide-react";
import { createSubmission, sendConsentInvitation } from "@/app/actions/underwriting";
import type { ApiTraceEntry } from "@/lib/db/submissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const STEPS = ["Prospect", "Consent", "Data pull"] as const;

function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function UnderwritingWizard({
  heroFleetOptions,
  initialFleetId,
}: {
  heroFleetOptions: { id: string; label: string }[];
  initialFleetId?: string;
}) {
  const router = useRouter();
  const defaultFleet = useMemo(() => {
    if (initialFleetId && heroFleetOptions.some((o) => o.id === initialFleetId)) return initialFleetId;
    return heroFleetOptions[0]?.id ?? "";
  }, [heroFleetOptions, initialFleetId]);

  const [step, setStep] = useState(0);
  const [fleetId, setFleetId] = useState(defaultFleet);
  const [dotNumber, setDotNumber] = useState("");
  const [mcNumber, setMcNumber] = useState("");
  const [legalName, setLegalName] = useState("");
  const [estimatedFleetSize, setEstimatedFleetSize] = useState("");
  const [commoditiesRaw, setCommoditiesRaw] = useState("");
  const [statesRaw, setStatesRaw] = useState("");

  const [consentTrace, setConsentTrace] = useState<ApiTraceEntry[]>([]);
  const [consentSimulated, setConsentSimulated] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pullBusy, setPullBusy] = useState(false);
  const [timings, setTimings] = useState<[string, number][]>([]);
  const [visibleTimingRows, setVisibleTimingRows] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const selectedLabel = heroFleetOptions.find((o) => o.id === fleetId)?.label ?? "";

  const prospect = {
    dotNumber: dotNumber.trim() || undefined,
    mcNumber: mcNumber.trim() || undefined,
    legalName: legalName.trim() || undefined,
    estimatedFleetSize: estimatedFleetSize.trim() || undefined,
    commodities: parseList(commoditiesRaw),
    primaryStates: parseList(statesRaw).map((s) => s.toUpperCase()),
    heroFleetLabel: selectedLabel || undefined,
  };

  async function onRunConsent() {
    setConsentBusy(true);
    setSubmitError(null);
    try {
      const r = await sendConsentInvitation({ fleetId, prospect });
      setConsentTrace(r.trace);
      setConsentSimulated(r.simulated);
      setStep(2);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Consent step failed");
    } finally {
      setConsentBusy(false);
    }
  }

  async function onRunPull() {
    setPullBusy(true);
    setSubmitError(null);
    setTimings([]);
    setVisibleTimingRows(0);
    setSubmissionId(null);
    try {
      const r = await createSubmission({
        fleetId,
        prospect,
        consentTrace,
        consentSimulated,
      });
      const entries = Object.entries(r.endpointTimings).sort((a, b) => a[0].localeCompare(b[0]));
      setTimings(entries);
      setSubmissionId(r.submissionId);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setPullBusy(false);
    }
  }

  useEffect(() => {
    if (!submissionId || timings.length === 0) return;
    if (visibleTimingRows >= timings.length) {
      const t = setTimeout(() => {
        router.push(`/underwriting/${submissionId}`);
      }, 1200);
      return () => clearTimeout(t);
    }
    const delay = Math.min(220, Math.floor(2800 / Math.max(1, timings.length)));
    const t = setTimeout(() => setVisibleTimingRows((v) => v + 1), delay);
    return () => clearTimeout(t);
  }, [submissionId, timings, visibleTimingRows, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`rounded-full border px-3 py-1 text-sm ${
              i === step ? "border-primary bg-muted font-medium" : "border-border text-muted-foreground"
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Prospect & fleet</CardTitle>
            <CardDescription>Select a hero fleet fixture and capture prospect identifiers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="fleet">Hero fleet</Label>
              <select
                id="fleet"
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                value={fleetId}
                onChange={(e) => setFleetId(e.target.value)}
              >
                {heroFleetOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal">Legal name</Label>
              <Input id="legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Acme Trucking LLC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Fleet size (estimate)</Label>
              <Input
                id="size"
                value={estimatedFleetSize}
                onChange={(e) => setEstimatedFleetSize(e.target.value)}
                placeholder="e.g. 42 power units"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dot">DOT</Label>
              <Input id="dot" value={dotNumber} onChange={(e) => setDotNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc">MC</Label>
              <Input id="mc" value={mcNumber} onChange={(e) => setMcNumber(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="commodities">Commodities (comma-separated)</Label>
              <Input
                id="commodities"
                value={commoditiesRaw}
                onChange={(e) => setCommoditiesRaw(e.target.value)}
                placeholder="Refrigerated, dry van"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="states">Primary states (comma-separated)</Label>
              <Input id="states" value={statesRaw} onChange={(e) => setStatesRaw(e.target.value)} placeholder="TX, OK" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="button" onClick={() => setStep(1)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Consent & data sharing</CardTitle>
              <CardDescription>
                Keystone requests read-only telematics via Catena. If the sandbox rejects writes, we record simulated
                consent and continue for demo purposes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                The invitation targets the selected fleet. Share agreements are listed and the first pending agreement
                for this fleet is activated when possible.
              </p>
              {consentSimulated ? (
                <Alert>
                  <AlertTitle>Demo mode</AlertTitle>
                  <AlertDescription>
                    At least one consent API call used the sandbox-safe fallback. Submission will be flagged as simulated.
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="flex justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button type="button" onClick={onRunConsent} disabled={consentBusy}>
                  {consentBusy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    "Send invitation & activate share"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Flow</CardTitle>
              <CardDescription>Keystone orchestrates Catena on behalf of the carrier.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                <FlowBox icon={<Building2 className="h-6 w-6" />} title="Keystone" subtitle="Workbench" />
                <AnimatedArrow />
                <FlowBox icon={<Shield className="h-6 w-6" />} title="Catena" subtitle="Telematics hub" />
                <AnimatedArrow />
                <FlowBox icon={<Building2 className="h-6 w-6" />} title="Carrier" subtitle="Underwriting" />
              </div>
              <Separator className="my-6" />
              <Collapsible>
                <CollapsibleTrigger className="text-primary text-sm font-medium">Developer view</CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 text-xs">
                    {consentTrace.length === 0
                      ? "Run the step to populate HTTP trace rows."
                      : JSON.stringify(consentTrace, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Data pull & scoring</CardTitle>
            <CardDescription>
              We build a fleet dossier from the Catena API (cached 1 hour), compute peer benchmarks from fixture
              cohorts plus this fleet, then persist the submission locally.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" onClick={onRunPull} disabled={pullBusy}>
                {pullBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Pulling dossier…
                  </>
                ) : (
                  "Run analysis"
                )}
              </Button>
            </div>

            {timings.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Endpoint timings (actual milliseconds)</p>
                <ul className="space-y-1">
                  {timings.slice(0, visibleTimingRows).map(([path, ms]) => (
                    <li key={path} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span className="truncate font-mono text-xs">{path}</span>
                      <span className="text-muted-foreground metric-tabular">{ms} ms</span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">
                  Redirecting to the risk report{submissionId ? ` ${submissionId.slice(0, 8)}…` : ""}.
                </p>
              </div>
            ) : null}

            {!pullBusy && timings.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Peer cohort uses fixture dossiers under <code className="text-xs">src/lib/fixtures/fleets</code> plus your
                target fleet from the API (see tooltip on the report).
              </p>
            ) : null}

            {pullBusy ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Building dossier and computing score — this stays within the 60s rehearsal target on sandbox.
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function FlowBox({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="bg-card flex flex-1 flex-col items-center rounded-lg border border-border p-4 text-center shadow-sm">
      <div className="text-primary mb-2">{icon}</div>
      <div className="font-semibold">{title}</div>
      <div className="text-muted-foreground text-xs">{subtitle}</div>
    </div>
  );
}

function AnimatedArrow() {
  return (
    <div
      className="text-primary hidden shrink-0 px-1 text-2xl sm:block motion-safe:animate-pulse"
      aria-hidden
    >
      →
    </div>
  );
}
