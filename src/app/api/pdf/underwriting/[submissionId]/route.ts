import { renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getSubmission } from "@/lib/db/submissions";
import type { RiskScore } from "@/lib/risk/scoring";
import type { ProspectPayload, ApiTraceEntry } from "@/lib/db/submissions";
import type { FleetDossier } from "@/lib/domain/fleet-dossier";
import { UnderwritingReportPDF } from "@/lib/pdf/underwriting-report-pdf";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { submissionId: string } },
) {
  const row = getSubmission(params.submissionId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const score = JSON.parse(row.score_json) as RiskScore;
  const prospect = JSON.parse(row.prospect_json) as ProspectPayload;
  const dossier = JSON.parse(row.dossier_json) as FleetDossier;
  const apiTrace = JSON.parse(row.api_trace_json) as ApiTraceEntry[];

  const stream = await renderToStream(
    UnderwritingReportPDF({ score, prospect, dossier, apiTrace }),
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const pdf = Buffer.concat(chunks);

  const name = `keystone-underwriting-${params.submissionId.slice(0, 8)}.pdf`;
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
