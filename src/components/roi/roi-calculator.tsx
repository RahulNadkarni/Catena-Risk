"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { FleetRoiMetrics } from "@/app/actions/roi";

interface Inputs {
  annualPremiumM: number;       // $M
  currentLossRatioPct: number;  // e.g. 75
  insuredFleets: number;
  quotesPerYear: number;
  claimsPerYear: number;
  acvK: number;                 // $K
}

interface Outputs {
  lossRatioSavingsM: number;
  selectionLiftM: number;
  claimsResolutionM: number;
  totalBenefitM: number;
  netRoiM: number;
  roiMultiple: number;
  paybackMonths: number;
}

function compute(inp: Inputs): Outputs {
  const premium = inp.annualPremiumM;
  const acv = inp.acvK / 1000; // $M

  // Loss ratio improvement: assume 4 pt improvement from better risk selection
  const lrImprovement = 0.04;
  const lossRatioSavings = premium * lrImprovement;

  // Underwriting selection lift: 5% of premium avoided from declined/referred risks
  const selectionLift = premium * 0.05;

  // Claims resolution: faster packet generation saves ~$5k/claim in legal fees
  const claimsSavings = (inp.claimsPerYear * 5000) / 1_000_000; // $M

  const totalBenefit = lossRatioSavings + selectionLift + claimsSavings;
  const netRoi = totalBenefit - acv;
  const roiMultiple = acv > 0 ? totalBenefit / acv : 0;
  const paybackMonths = totalBenefit > 0 ? Math.round((acv / totalBenefit) * 12) : 99;

  return {
    lossRatioSavingsM: lossRatioSavings,
    selectionLiftM: selectionLift,
    claimsResolutionM: claimsSavings,
    totalBenefitM: totalBenefit,
    netRoiM: netRoi,
    roiMultiple,
    paybackMonths,
  };
}

function buildSensitivity(inp: Inputs) {
  return Array.from({ length: 10 }, (_, i) => {
    const lrImprovementPts = i + 1;
    const savings = inp.annualPremiumM * (lrImprovementPts / 100);
    const total = savings + inp.annualPremiumM * 0.05 + (inp.claimsPerYear * 5000) / 1_000_000;
    const net = total - inp.acvK / 1000;
    return { pts: lrImprovementPts, netRoiM: Math.round(net * 100) / 100 };
  });
}

function fmtM(v: number) {
  return `$${v.toFixed(1)}M`;
}

function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-2">
        {prefix && <span className="text-muted-foreground text-sm">{prefix}</span>}
        <input
          type="number"
          className="min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none"
          value={value}
          step={step ?? 1}
          min={min ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="text-muted-foreground text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

function ResultRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`metric-tabular text-sm font-semibold ${accent ? "text-emerald-700" : ""}`}>{value}</span>
    </div>
  );
}

export function RoiCalculator({ metrics }: { metrics: FleetRoiMetrics | null }) {
  const [inp, setInp] = useState<Inputs>({
    annualPremiumM: 120,
    currentLossRatioPct: metrics?.suggestedLossRatioPct ?? 75,
    insuredFleets: 800,
    quotesPerYear: 2500,
    claimsPerYear: metrics?.suggestedClaimsPerYear ?? 400,
    acvK: 600,
  });

  const out = useMemo(() => compute(inp), [inp]);
  const sensitivity = useMemo(() => buildSensitivity(inp), [inp]);

  function set(k: keyof Inputs, v: number) {
    setInp((p) => ({ ...p, [k]: v }));
  }

  function downloadCsv() {
    const rows = [
      ["Metric", "Value"],
      ["Annual premium ($M)", inp.annualPremiumM],
      ["Current loss ratio (%)", inp.currentLossRatioPct],
      ["Insured fleets", inp.insuredFleets],
      ["Quotes per year", inp.quotesPerYear],
      ["Claims per year", inp.claimsPerYear],
      ["Catena Risk ACV ($K)", inp.acvK],
      [""],
      ["Loss ratio improvement savings ($M)", out.lossRatioSavingsM.toFixed(2)],
      ["Underwriting selection lift ($M)", out.selectionLiftM.toFixed(2)],
      ["Claims resolution savings ($M)", out.claimsResolutionM.toFixed(2)],
      ["Total annual benefit ($M)", out.totalBenefitM.toFixed(2)],
      ["Net ROI ($M)", out.netRoiM.toFixed(2)],
      ["ROI multiple", `${out.roiMultiple.toFixed(1)}x`],
      ["Payback (months)", out.paybackMonths],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catena-risk-roi.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Real fleet metrics from Catena API */}
      {metrics && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Live fleet baseline</CardTitle>
              <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 text-xs">
                Catena API · {metrics.dataWindowDays}-day window
              </Badge>
            </div>
            <CardDescription>
              Real telematics data from {metrics.totalDrivers} drivers across {metrics.totalVehicles} vehicles.
              Loss ratio and claims inputs pre-set from actual fleet performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Safety events/driver-month", value: metrics.safetyEventsPerDriverMonth.toFixed(1), sub: `${metrics.safetyEventCount30d} events, ${metrics.dataWindowDays}d` },
                { label: "HOS violations/driver-month", value: metrics.hosViolationsPerDriverMonth.toFixed(1), sub: `${metrics.hosViolationCount30d} violations` },
                { label: "DVIR defect rate", value: `${(metrics.dvirDefectRate * 100).toFixed(1)}%`, sub: `of ${metrics.dvirLogCount} inspections` },
                { label: "Total drivers", value: metrics.totalDrivers, sub: `${metrics.totalVehicles} vehicles` },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-lg border border-blue-200 bg-white px-3 py-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-semibold tabular-nums text-blue-900">{value}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      {/* Inputs */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business inputs</CardTitle>
            <CardDescription>
              {metrics
                ? "Loss ratio and claims pre-loaded from live Catena fleet data — adjust to model your full book."
                : "Keystone scenario defaults — adjust to model your book."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <NumberInput label="Annual premium" value={inp.annualPremiumM} onChange={(v) => set("annualPremiumM", v)} prefix="$" suffix="M" step={10} />
            <NumberInput label="Current loss ratio" value={inp.currentLossRatioPct} onChange={(v) => set("currentLossRatioPct", v)} suffix="%" step={1} />
            <NumberInput label="Insured fleets" value={inp.insuredFleets} onChange={(v) => set("insuredFleets", v)} />
            <NumberInput label="Quotes per year" value={inp.quotesPerYear} onChange={(v) => set("quotesPerYear", v)} />
            <NumberInput label="Claims per year" value={inp.claimsPerYear} onChange={(v) => set("claimsPerYear", v)} />
            <NumberInput label="Catena Risk ACV" value={inp.acvK} onChange={(v) => set("acvK", v)} prefix="$" suffix="K" step={50} />
          </CardContent>
        </Card>

        {/* Sensitivity chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sensitivity: Net ROI vs loss ratio improvement</CardTitle>
            <CardDescription>Net annual ROI ($M) across a 1–10 point loss ratio improvement range at your current premium base.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensitivity} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="pts" tickFormatter={(v) => `${v}pt`} tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(v) => [`$${Number(v).toFixed(1)}M`, "Net ROI"]} labelFormatter={(l) => `${l}pt LR improvement`} />
                  <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="netRoiM" stroke="#0f766e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Assumes telematics-driven 4pt baseline improvement plus 5% selection lift and $5K savings per claim.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="text-base">Estimated annual ROI</CardTitle>
            <CardDescription>Based on Keystone scenario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <ResultRow label="Loss ratio improvement" value={fmtM(out.lossRatioSavingsM)} />
            <ResultRow label="Underwriting selection lift" value={fmtM(out.selectionLiftM)} />
            <ResultRow label="Claims resolution savings" value={fmtM(out.claimsResolutionM)} />
            <Separator className="my-2" />
            <ResultRow label="Total annual benefit" value={fmtM(out.totalBenefitM)} accent />
            <ResultRow label="Catena Risk ACV" value={`-$${(inp.acvK / 1000).toFixed(1)}M`} />
            <Separator className="my-2" />
            <ResultRow label="Net annual ROI" value={fmtM(out.netRoiM)} accent />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "ROI multiple", value: `${out.roiMultiple.toFixed(1)}x` },
            { label: "Payback period", value: `${out.paybackMonths} months` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="metric-tabular text-2xl font-semibold text-emerald-700">{value}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={downloadCsv}
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition"
        >
          Download as CSV
        </button>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Illustrative model only. Actual ROI depends on portfolio composition, implementation, and underwriting discipline.
          {metrics
            ? " Loss ratio and claims inputs derived from live Catena fleet data."
            : " The 4pt loss ratio improvement is directional based on telematics-informed selection research."}
        </p>
      </div>
    </div>
    </div>
  );
}
