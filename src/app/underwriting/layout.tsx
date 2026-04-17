import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export const runtime = "nodejs";

export default function UnderwritingLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
