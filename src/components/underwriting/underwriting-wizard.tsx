"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  Link as LinkIcon,
  Loader2,
  Shield,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  createSubmission,
  getFleetPreview,
  sendConsentInvitation,
} from "@/app/actions/underwriting";
import {
  PERMISSION_LABELS,
  REQUESTED_PERMISSIONS,
  type ConsentResult,
  type DossierSummary,
  type FleetPreview,
} from "@/lib/underwriting/consent-permissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const STEPS = ["Prospect", "Consent", "Data pull"] as const;

const ENDPOINT_LABELS: Record<string, string> = {
  getFleet: "Fleet profile",
  listVehicles: "Vehicle roster",
  listUsers: "Drivers",
  listDriverSafetyEvents: "Driver safety events",
  listVehicleLocations: "Vehicle location history",
  listHosEvents: "HOS event log",
  listHosViolations: "HOS violations",
  listHosDailySnapshots: "HOS daily snapshots",
  listHosAvailabilities: "HOS availability",
  listDvirLogs: "DVIR logs",
  listEngineLogs: "Engine diagnostics",
  listConnections: "Telematics connections",
  getAnalyticsOverview: "Analytics overview",
};

function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function labelForEndpoint(path: string): string {
  const root = path.replace(/#.*$/, "").replace(/:error$/, "");
  return ENDPOINT_LABELS[root] ?? root;
}

function formatDateShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function relativeFromNow(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const deltaMs = d.getTime() - Date.now();
  const abs = Math.abs(deltaMs);
  const min = Math.round(abs / 60_000);
  const hr = Math.round(abs / 3_600_000);
  const day = Math.round(abs / 86_400_000);
  const sign = deltaMs >= 0 ? "in " : "";
  const suffix = deltaMs >= 0 ? "" : " ago";
  if (min < 60) return `${sign}${min}m${suffix}`;
  if (hr < 48) return `${sign}${hr}h${suffix}`;
  return `${sign}${day}d${suffix}`;
}

export function UnderwritingWizard({
  heroFleetOptions,
  initialFleetId,
}: {
  heroFleetOptions: Array<{ id: string; label: string }>;
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

  const [fleetPreview, setFleetPreview] = useState<FleetPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const prefilledFromPreviewRef = useRef<string | null>(null);

  const [consentResult, setConsentResult] = useState<ConsentResult | null>(null);
  const [consentAttempted, setConsentAttempted] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pullBusy, setPullBusy] = useState(false);
  const [timings, setTimings] = useState<[string, number][]>([]);
  const [visibleTimingRows, setVisibleTimingRows] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [dossierSummary, setDossierSummary] = useState<DossierSummary | null>(null);

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

  const loadPreview = useCallback(async (id: string) => {
    if (!id) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const p = await getFleetPreview(id);
      setFleetPreview(p);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Failed to load fleet preview");
      setFleetPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    setFleetPreview(null);
    setPreviewError(null);
    if (fleetId) loadPreview(fleetId);
  }, [fleetId, loadPreview]);

  // Prefill form fields from the Catena-known fleet data — once per fleet, and
  // only into fields the user hasn't already edited.
  useEffect(() => {
    if (!fleetPreview?.fleet) return;
    if (prefilledFromPreviewRef.current === fleetPreview.fleetId) return;
    prefilledFromPreviewRef.current = fleetPreview.fleetId;
    const f = fleetPreview.fleet;
    setLegalName((cur) => cur || f.legalName || f.name || "");
    setDotNumber((cur) => {
      if (cur) return cur;
      if (f.regulatoryIdType === "DOT" && f.regulatoryId) return f.regulatoryId;
      return cur;
    });
    setEstimatedFleetSize((cur) => {
      if (cur) return cur;
      if (fleetPreview.analytics.vehicleCount != null) {
        return `${fleetPreview.analytics.vehicleCount} power units`;
      }
      return cur;
    });
  }, [fleetPreview]);

  async function onRunConsent() {
    setConsentBusy(true);
    setSubmitError(null);
    setConsentAttempted(true);
    try {
      const r = await sendConsentInvitation({ fleetId, prospect });
      setConsentResult(r);
      if (!r.simulated) setStep(2);
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
    setDossierSummary(null);
    try {
      const r = await createSubmission({
        fleetId,
        prospect,
        consentTrace: consentResult?.trace ?? [],
        consentSimulated: consentResult?.simulated ?? false,
      });
      const entries = Object.entries(r.endpointTimings).sort((a, b) => a[0].localeCompare(b[0]));
      setTimings(entries);
      setSubmissionId(r.submissionId);
      setDossierSummary(r.summary);
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
      }, 1800);
      return () => clearTimeout(t);
    }
    const delay = Math.min(220, Math.floor(2800 / Math.max(1, timings.length)));
    const t = setTimeout(() => setVisibleTimingRows((v) => v + 1), delay);
    return () => clearTimeout(t);
  }, [submissionId, timings, visibleTimingRows, router]);

  const requestedPermKeys = Object.keys(REQUESTED_PERMISSIONS);

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
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Prospect & fleet</CardTitle>
              <CardDescription>
                Pick the sandbox fleet you&apos;re underwriting. We pull what Catena already knows and
                prefill the form; you can override any field.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="fleet">Sandbox fleet</Label>
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
                  Continue to consent
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <FleetSnapshotCard
              preview={fleetPreview}
              loading={previewLoading}
              error={previewError}
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Consent & data sharing</CardTitle>
              <CardDescription>
                We request read-only access to the specific telematics resources we&apos;ll pull in the
                next step. The carrier reviews and signs the agreement via the magic link we get back.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                  Requested permissions ({requestedPermKeys.length})
                </div>
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {requestedPermKeys.map((k) => (
                    <li key={k} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs">
                      <span>{PERMISSION_LABELS[k] ?? k}</span>
                      <Badge variant="outline">read</Badge>
                    </li>
                  ))}
                </ul>
              </div>

              {fleetPreview && fleetPreview.shareAgreements.length > 0 ? (
                <div>
                  <div className="mb-2 text-sm font-medium">Existing share agreements for this fleet</div>
                  <ul className="space-y-1">
                    {fleetPreview.shareAgreements.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>
                          <span className="font-mono">{s.id.slice(0, 8)}…</span>
                        </div>
                        <span className="text-muted-foreground">
                          {Object.keys(s.permissions).length} perms · {formatDateShort(s.createdAt) ?? "no date"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {fleetPreview && fleetPreview.connections.length > 0 ? (
                <div>
                  <div className="mb-2 text-sm font-medium">Existing telematics connections</div>
                  <ul className="space-y-1">
                    {fleetPreview.connections.slice(0, 4).map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {c.status === "active" ? (
                            <Wifi className="h-3 w-3 text-emerald-600" aria-hidden />
                          ) : (
                            <WifiOff className="h-3 w-3 text-muted-foreground" aria-hidden />
                          )}
                          <span>{c.sourceName}</span>
                          <Badge variant="outline">{c.status}</Badge>
                        </div>
                        <span className="text-muted-foreground">
                          {relativeFromNow(c.updatedAt) ?? formatDateShort(c.updatedAt) ?? ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {consentAttempted && consentResult?.simulated ? (
                <Alert variant="destructive">
                  <AlertTitle>Catena consent API did not accept the request</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      {consentResult.consentError ??
                        "POST /v2/orgs/invitations or PATCH /v2/orgs/share_agreements failed."}
                    </p>
                    <p className="text-xs">
                      In production the workflow would block here until a signed share agreement is
                      in place. For the sandbox demo you can continue — the submission will be
                      flagged as <span className="font-mono">simulated consent</span> on the risk
                      report.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : consentAttempted && consentResult && !consentResult.simulated ? (
                <Alert>
                  <AlertTitle>Consent recorded</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>
                      Invitation accepted
                      {consentResult.activatedAgreement
                        ? ` and share agreement ${consentResult.activatedAgreement.id.slice(0, 8)}… activated.`
                        : "."}
                    </p>
                    {consentResult.invitation?.magicLink ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <LinkIcon className="h-3 w-3" aria-hidden />
                        <a
                          className="text-primary underline underline-offset-2"
                          href={consentResult.invitation.magicLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open carrier magic link
                          <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden />
                        </a>
                        {consentResult.invitation.expiresAt ? (
                          <span className="text-muted-foreground">
                            expires {relativeFromNow(consentResult.invitation.expiresAt) ?? ""}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                {consentAttempted && consentResult?.simulated ? (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onRunConsent} disabled={consentBusy}>
                      {consentBusy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          Retrying…
                        </>
                      ) : (
                        "Retry"
                      )}
                    </Button>
                    <Button type="button" onClick={() => setStep(2)}>
                      Continue in demo mode
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ) : (
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
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Flow</CardTitle>
              <CardDescription>How the consent request travels between systems.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                <FlowBox icon={<Building2 className="h-6 w-6" />} title="Workbench" subtitle="Underwriting" />
                <AnimatedArrow />
                <FlowBox icon={<Shield className="h-6 w-6" />} title="Catena" subtitle="Telematics hub" />
                <AnimatedArrow />
                <FlowBox icon={<Building2 className="h-6 w-6" />} title="Carrier" subtitle="Signs magic link" />
              </div>
              <Separator className="my-6" />
              <Collapsible>
                <CollapsibleTrigger className="text-primary text-sm font-medium">Developer view</CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 text-xs">
                    {!consentResult || consentResult.trace.length === 0
                      ? "Run the step to populate HTTP trace rows."
                      : JSON.stringify(consentResult.trace, null, 2)}
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
              We build a 30-day fleet dossier from Catena (cached 1 hour), compute peer benchmarks,
              score the risk, and save the submission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!pullBusy && timings.length === 0 ? (
              <PrePullPreview preview={fleetPreview} />
            ) : null}

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
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Endpoints pulled</p>
                  <ul className="space-y-1">
                    {timings.slice(0, visibleTimingRows).map(([path, ms]) => {
                      const isError = path.endsWith(":error");
                      return (
                        <li
                          key={path}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                            isError ? "border-destructive/50 bg-destructive/5" : "border-border"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate">{labelForEndpoint(path)}</div>
                            <div className="text-muted-foreground truncate font-mono text-[10px]">{path}</div>
                          </div>
                          <span className="text-muted-foreground metric-tabular shrink-0 pl-2 text-xs">{ms} ms</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {dossierSummary ? (
                  <PostPullSummary summary={dossierSummary} submissionId={submissionId} />
                ) : null}
              </div>
            ) : null}

            {pullBusy ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Building dossier and computing score…
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function FleetSnapshotCard({
  preview,
  loading,
  error,
}: {
  preview: FleetPreview | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4 text-primary" aria-hidden />
          Fleet snapshot
        </CardTitle>
        <CardDescription>Live read from Catena for the selected fleet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading fleet profile…
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t load fleet</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        ) : !preview ? (
          <p className="text-muted-foreground text-xs">Pick a fleet to see what Catena already knows.</p>
        ) : (
          <>
            <FleetIdentitySection preview={preview} />
            <Separator />
            <FleetCountsSection preview={preview} />
            <Separator />
            <FleetConnectionsSection preview={preview} />
            {preview.errors.length > 0 ? (
              <>
                <Separator />
                <div className="text-muted-foreground text-[10px]">
                  Some endpoints failed: {preview.errors.join(" · ")}
                </div>
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FleetIdentitySection({ preview }: { preview: FleetPreview }) {
  const f = preview.fleet;
  const fx = preview.fixture;
  const displayName =
    f?.legalName ?? f?.name ?? f?.dbaName ?? (fx?.rank != null ? `Hero fleet #${fx.rank}` : "Unnamed fleet");
  const fleetRef = f?.fleetRef ?? null;
  const regulatoryId = f?.regulatoryId ?? null;
  const joinedIso = f?.createdAt ?? fx?.firstSeenAt ?? null;
  const location = [f?.city, f?.province, f?.countryCode].filter(Boolean).join(", ") || null;
  const website = f?.websites?.[0] ?? null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">{displayName}</div>
        {fx?.score != null ? (
          <div className="shrink-0 rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-right">
            <div className="text-muted-foreground text-[9px] uppercase tracking-wide">Fixture score</div>
            <div className="metric-tabular text-sm font-semibold leading-tight">{fx.score}</div>
          </div>
        ) : null}
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-1.5 text-[11px]">
        {fx?.rank != null ? <Badge variant="default">hero · rank {fx.rank}</Badge> : null}
        {fleetRef ? <Badge variant="outline">ref {fleetRef}</Badge> : null}
        {regulatoryId ? (
          <Badge variant="outline">
            {f?.regulatoryIdType ?? "reg"} {regulatoryId}
          </Badge>
        ) : null}
        {joinedIso ? <Badge variant="ghost">joined {formatDateShort(joinedIso)}</Badge> : null}
      </div>
      {location ? <div className="text-muted-foreground text-xs">{location}</div> : null}
      {website ? (
        <a
          href={website.startsWith("http") ? website : `https://${website}`}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
        >
          {website}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      ) : null}
      {!f && fx ? (
        <div className="text-muted-foreground text-[10px]">
          Sandbox has no identity fields for this fleet — showing the committed hero-fixture snapshot.
        </div>
      ) : null}
    </div>
  );
}

function FleetCountsSection({ preview }: { preview: FleetPreview }) {
  const a = preview.analytics;
  const fx = preview.fixture;
  const fmt = (n: number | null | undefined): string =>
    n == null ? "—" : n.toLocaleString();

  const topRow: { label: string; value: string; icon: ReactNode }[] = [
    {
      label: "Vehicles",
      value: fmt(a.vehicleCount),
      icon: <Building2 className="h-3.5 w-3.5" aria-hidden />,
    },
    {
      label: "Drivers",
      value: fmt(a.driverCount),
      icon: <Users className="h-3.5 w-3.5" aria-hidden />,
    },
    {
      label: "Trailers",
      value: fmt(a.trailerCount),
      icon: <FileText className="h-3.5 w-3.5" aria-hidden />,
    },
  ];
  // Only show the fixture detail row when we actually have fixture data.
  const detailRow = fx
    ? [
        { label: "Safety events", value: fmt(fx.safetyEventCount) },
        { label: "HOS events", value: fmt(fx.hosEventCount) },
        { label: "DVIR logs", value: fmt(fx.dvirLogCount) },
      ]
    : null;

  const sourceLabel =
    a.source === "fixture"
      ? "from hero fixture"
      : a.source === "api"
      ? "from Catena analytics overview"
      : "not available";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {topRow.map((it) => (
          <div key={it.label} className="rounded-md border border-border px-2 py-1.5">
            <div className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase tracking-wide">
              {it.icon}
              {it.label}
            </div>
            <div className="metric-tabular text-sm font-semibold">{it.value}</div>
          </div>
        ))}
      </div>
      {detailRow ? (
        <div className="grid grid-cols-3 gap-2">
          {detailRow.map((it) => (
            <div key={it.label} className="rounded-md border border-border px-2 py-1.5">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wide">{it.label}</div>
              <div className="metric-tabular text-sm font-semibold">{it.value}</div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="text-muted-foreground text-[10px]">Counts {sourceLabel}.</div>
    </div>
  );
}

function FleetConnectionsSection({ preview }: { preview: FleetPreview }) {
  const conns = preview.connections;
  const fixtureSources = preview.fixture?.telematicsSources ?? [];
  if (conns.length === 0 && fixtureSources.length === 0) {
    return (
      <div className="text-muted-foreground text-xs">
        No telematics connections on record for this fleet yet.
      </div>
    );
  }
  if (conns.length === 0) {
    return (
      <div className="space-y-1">
        <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Connections</div>
        <div className="text-xs">
          {fixtureSources.length} source{fixtureSources.length === 1 ? "" : "s"} in fixture:{" "}
          <span className="font-medium">{fixtureSources.join(", ")}</span>
        </div>
      </div>
    );
  }
  const latest = [...conns].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Connections</div>
      <div className="text-xs">
        {conns.length} source{conns.length === 1 ? "" : "s"} — latest{" "}
        <span className="font-medium">{latest.sourceName}</span>{" "}
        <span className="text-muted-foreground">
          ({latest.status}, {relativeFromNow(latest.updatedAt) ?? formatDateShort(latest.updatedAt)})
        </span>
      </div>
    </div>
  );
}

function PrePullPreview({ preview }: { preview: FleetPreview | null }) {
  if (!preview) return null;
  const { analytics, connections } = preview;
  return (
    <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
      <div className="mb-2 font-medium">Ready to pull</div>
      <ul className="text-muted-foreground space-y-1 text-xs">
        <li>
          • 30-day window across {Object.keys(REQUESTED_PERMISSIONS).length} resource types
          (vehicles, drivers, safety events, HOS, DVIR, engine logs).
        </li>
        <li>
          • Fleet currently has{" "}
          <span className="font-medium">
            {analytics.vehicleCount != null ? analytics.vehicleCount.toLocaleString() : "—"}
          </span>{" "}
          vehicles,{" "}
          <span className="font-medium">
            {analytics.driverCount != null ? analytics.driverCount.toLocaleString() : "—"}
          </span>{" "}
          drivers on Catena.
        </li>
        <li>
          • {connections.length} active telematics connection{connections.length === 1 ? "" : "s"} feeding the
          dossier.
        </li>
      </ul>
    </div>
  );
}

function PostPullSummary({
  summary,
  submissionId,
}: {
  summary: DossierSummary;
  submissionId: string | null;
}) {
  const stats: { label: string; value: number }[] = [
    { label: "Vehicles", value: summary.vehicleCount },
    { label: "Drivers", value: summary.driverCount },
    { label: "Safety events", value: summary.safetyEventCount },
    { label: "HOS events", value: summary.hosEventCount },
    { label: "HOS violations", value: summary.hosViolationCount },
    { label: "DVIR logs", value: summary.dvirLogCount },
    { label: "DVIR defects", value: summary.dvirDefectCount },
    { label: "Engine logs", value: summary.engineLogCount },
  ];
  const start = formatDateShort(summary.windowStart);
  const end = formatDateShort(summary.windowEnd);
  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium">Dossier built</div>
        <div className="text-muted-foreground text-xs">
          {summary.windowDays}-day window{start && end ? ` · ${start} → ${end}` : ""} · {summary.totalApiCalls}{" "}
          API calls · {summary.totalLatencyMs} ms total
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-border px-2 py-1.5">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wide">{s.label}</div>
            <div className="metric-tabular text-sm font-semibold">{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
      {summary.riskScoreValue != null ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Composite score</div>
          <div className="flex items-baseline gap-2">
            <span className="metric-tabular text-xl font-semibold">
              {Math.round(summary.riskScoreValue)}
            </span>
            {summary.riskScoreBand ? (
              <Badge variant="outline">{summary.riskScoreBand}</Badge>
            ) : null}
          </div>
        </div>
      ) : null}
      {summary.dataGaps.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Partial data</AlertTitle>
          <AlertDescription className="text-xs">
            {summary.dataGaps.map(labelForEndpoint).join(", ")} returned partial results.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="text-muted-foreground text-xs">
        Redirecting to the risk report{submissionId ? ` ${submissionId.slice(0, 8)}…` : ""}
      </div>
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
