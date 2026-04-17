import { notFound } from "next/navigation";
import { getSubmissionAction } from "@/app/actions/underwriting";
import { createCatenaClientFromEnv } from "@/lib/catena/client";
import { computeExposureMetrics } from "@/lib/domain/derived-metrics";
import { mapRawDrivers } from "@/components/report/drivers-table";
import { RiskReportView } from "@/components/report/risk-report-view";

export const runtime = "nodejs";

export default async function SubmissionReportPage({
  params,
}: {
  params: { submissionId: string };
}) {
  const row = await getSubmissionAction(params.submissionId);
  if (!row) notFound();

  const client = createCatenaClientFromEnv();
  let driverRows: ReturnType<typeof mapRawDrivers> = [];
  try {
    const page = await client.listDriverSummaries({ fleet_ids: [row.fleet_id], size: 200 });
    driverRows = mapRawDrivers(page.items as Record<string, unknown>[], row.fleet_id);
  } catch {
    driverRows = [];
  }

  const exposure = computeExposureMetrics(row.dossier);

  return (
    <RiskReportView
      submissionId={row.id}
      fleetId={row.fleet_id}
      prospect={row.prospect}
      dossier={row.dossier}
      score={row.score}
      peerBenchmarks={row.peerBenchmarks}
      apiTrace={row.apiTrace}
      consentSimulated={row.consentSimulated}
      driverRows={driverRows}
      exposure={exposure}
    />
  );
}
