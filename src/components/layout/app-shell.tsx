import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/underwriting/new", label: "New submission" },
  { href: "/claims", label: "Claims" },
];

export interface AppShellProps {
  children: ReactNode;
  rightRail?: ReactNode;
  className?: string;
}

export function AppShell({ children, rightRail, className }: AppShellProps) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-background", className)}>
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-semibold tracking-tight text-foreground">
              Keystone
              <span className="text-muted-foreground font-normal"> · Risk workbench</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="text-sm text-muted-foreground">Catena telematics</div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6">
        <main className="min-w-0 flex-1">{children}</main>
        {rightRail ? <aside className="hidden w-72 shrink-0 lg:block">{rightRail}</aside> : null}
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Underwriting views are powered by Catena API data. Region polygons are not available in this tenant; maps use
            vehicle locations only.
          </p>
          <p className="tabular-nums">Phase 3 · Workbench</p>
        </div>
      </footer>
    </div>
  );
}
