import { RoiCalculator } from "@/components/roi/roi-calculator";

export const runtime = "nodejs";

export default function RoiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ROI Calculator</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Model the financial impact of Catena telematics on underwriting performance.
          Pre-loaded with the Keystone Freight Insurance pilot scenario.
        </p>
      </div>
      <RoiCalculator />
    </div>
  );
}
