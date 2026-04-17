import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = "nodejs";

export default function ClaimsPlaceholderPage() {
  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Claims</CardTitle>
          <CardDescription>Phase 4 placeholder — FNOL and loss runs will connect here.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          This route reserves navigation space in the Keystone shell. No claims data is wired yet.
        </CardContent>
      </Card>
    </AppShell>
  );
}
