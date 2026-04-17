import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
export const runtime = "nodejs";
export default function AboutLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
