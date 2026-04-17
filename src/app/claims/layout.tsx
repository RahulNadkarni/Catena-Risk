import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export const runtime = "nodejs";

export default function ClaimsLayout({
  children,
  searchParams,
}: {
  children: ReactNode;
  searchParams?: { demo?: string };
}) {
  const demoMode = searchParams?.demo === "1";
  return <AppShell demoMode={demoMode}>{children}</AppShell>;
}
