import { RoiCalculator } from "@/components/roi/roi-calculator";
import { fetchFleetRoiMetrics } from "@/app/actions/roi";
import type { FleetRoiMetrics } from "@/app/actions/roi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RoiPage() {
  let metrics: FleetRoiMetrics | null = null;
  try {
    metrics = await fetchFleetRoiMetrics();
  } catch {
    // Non-fatal — calculator falls back to Keystone scenario defaults
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ROI Calculator</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {metrics
            ? "Business case grounded in live Catena fleet data — loss ratio and claims pre-set from real telematics rates."
            : "Model the financial impact of Catena telematics on underwriting performance."}
        </p>
      </div>
      <RoiCalculator metrics={metrics} />
    </div>
  );
}
