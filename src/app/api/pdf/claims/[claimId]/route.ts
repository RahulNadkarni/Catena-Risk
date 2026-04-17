import { renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getClaim } from "@/lib/db/claims";
import type { DefensePacket } from "@/lib/claims/types";
import { DefensePacketPDF } from "@/lib/pdf/defense-packet-pdf";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { claimId: string } },
) {
  const row = getClaim(params.claimId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const packet = JSON.parse(row.defense_packet_json) as DefensePacket;

  const stream = await renderToStream(DefensePacketPDF({ packet }));

  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const pdf = Buffer.concat(chunks);

  const name = `keystone-defense-packet-${packet.claimNumber}.pdf`;
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
