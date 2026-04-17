import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LandingPortfolioTable } from "@/components/landing/landing-portfolio";
import { LandingRecentSubmissions } from "@/components/landing/landing-recent";
import { LandingStatsTiles } from "@/components/landing/landing-stats";
import {
  PortfolioSkeleton,
  RecentSkeleton,
  StatsTilesSkeleton,
} from "@/components/landing/landing-skeletons";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <AppShell>
      <div className="space-y-10">
        <section className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/40 p-8 shadow-sm">
          <p className="text-primary text-sm font-medium uppercase tracking-wide">Keystone underwriting</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Commercial auto risk intelligence
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-lg">
            Pull Catena telematics, score against a demo peer cohort, and produce an underwriter-ready report in under a
            minute for rehearsal.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/underwriting/new" className={buttonVariants({ size: "lg" })}>
              New submission
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
            <Link href="/portfolio" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Portfolio
            </Link>
            <Link href="/claims" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Claims
            </Link>
            <Link href="/roi" className={buttonVariants({ variant: "outline", size: "lg" })}>
              ROI calculator
            </Link>
            <Link href="/tech" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Architecture
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Live Catena stats</h2>
          <Suspense fallback={<StatsTilesSkeleton />}>
            <LandingStatsTiles />
          </Suspense>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Portfolio</h2>
            <Suspense fallback={<PortfolioSkeleton />}>
              <LandingPortfolioTable />
            </Suspense>
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pipeline</h2>
            <Suspense fallback={<RecentSkeleton />}>
              <LandingRecentSubmissions />
            </Suspense>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
