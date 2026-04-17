import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";

export const runtime = "nodejs";

export default function AboutPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">About Keystone Risk</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Forward Deployed Engineer pilot project · Catena Clearing API
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What Keystone does</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
          <p>
            Keystone Risk is a commercial auto underwriting workbench that transforms raw telematics
            data — pulled live from the Catena Clearing API — into actionable risk intelligence.
            Underwriters get a peer-relative risk score, a six-factor sub-score breakdown, and a
            narrative report generated from real ELD data in under a minute. Claims teams get an
            instant defense packet: speed timeline, HOS compliance snapshot, DVIR maintenance record,
            route replay, and a legal-ready narrative — all from the same unified Catena data layer.
          </p>
          <p className="mt-3">
            The platform is designed to answer the most important question in commercial trucking
            insurance: does the telematics evidence help or hurt our position? For underwriters,
            that means pricing decisions grounded in real driver behavior, not just DOT filings.
            For claims, it means knowing within seconds whether to defend aggressively or recommend
            early settlement — and having the data to back either position.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pilot customer</CardTitle>
            <CardDescription>
              <Badge variant="outline" className="text-xs">Fictional — created for demo</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Keystone Freight Insurance</span></p>
            <p>Mid-market MGA specializing in commercial trucking. $120M annual premium book, 800 insured fleets, 2,500 quotes/year.</p>
            <p>Pain points: loss ratio trending to 78%, claims lifecycle averaging 14 months, underwriting entirely document-driven with no telematics signal.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Forward Deployed Engineer</span> — Catena Clearing pilot</p>
            <p>Built in 4 phases across 2 days using the Catena sandbox API.</p>
            <ul className="mt-2 space-y-1 list-none">
              <li>Phase 1 — Types &amp; API exploration</li>
              <li>Phase 2 — Risk scoring engine</li>
              <li>Phase 3 — Underwriting workbench</li>
              <li>Phase 4 — Claims intelligence</li>
              <li>Phase 5 — Portfolio &amp; PDF export</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Catena API product feedback</h2>
        <p className="text-sm text-muted-foreground">Observations from implementing this pilot — intended as internal improvement recommendations:</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">Fuel transactions</span> — Not in the public spec. For commercial auto insurance this is a critical data point (off-route behavior, fraud detection). Recommend publishing this endpoint.</li>
          <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">Real-time alerts webhook</span> — A POST-based event stream for safety events would allow insurers to trigger loss-control interventions immediately vs. polling batch endpoints.</li>
          <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">Scoring percentiles</span> — Publishing a pre-computed peer percentile endpoint would reduce client-side scoring complexity and let Catena own the benchmark data.</li>
          <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">Driver photo/CDL</span> — Claims packets need driver identification. A document attachment endpoint tied to the driver record would strengthen the legal defensibility narrative.</li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-3 pb-8">
        <Link href="/tech" className={buttonVariants({ variant: "outline" })}>
          Architecture →
        </Link>
        <Link href="/roi" className={buttonVariants({ variant: "outline" })}>
          ROI calculator →
        </Link>
      </div>
    </div>
  );
}
