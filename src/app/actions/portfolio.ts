"use server";

import { listRecentSubmissions } from "@/lib/db/submissions";
import type { RiskScore } from "@/lib/risk/scoring";
import type { ProspectPayload } from "@/lib/db/submissions";
import type { PortfolioFleetRow } from "@/components/portfolio/fleet-table";

export async function getPortfolioRows(): Promise<PortfolioFleetRow[]> {
  const rows = listRecentSubmissions(50);

  // Build one row per fleet (latest submission per fleet)
  const latestPerFleet = new Map<string, typeof rows[0]>();
  const priorPerFleet = new Map<string, typeof rows[0]>();

  for (const row of rows) {
    if (!latestPerFleet.has(row.fleet_id)) {
      latestPerFleet.set(row.fleet_id, row);
    } else if (!priorPerFleet.has(row.fleet_id)) {
      priorPerFleet.set(row.fleet_id, row);
    }
  }

  return [...latestPerFleet.entries()].map(([fleetId, row]) => {
    const score = JSON.parse(row.score_json) as RiskScore;
    const prospect = JSON.parse(row.prospect_json) as ProspectPayload;
    const priorRow = priorPerFleet.get(fleetId);
    const priorScore = priorRow ? (JSON.parse(priorRow.score_json) as RiskScore) : null;
    const delta = priorScore != null ? score.compositeScore - priorScore.compositeScore : null;

    const name =
      prospect.legalName ||
      prospect.heroFleetLabel ||
      `Fleet ${fleetId.slice(0, 8)}`;

    return {
      submissionId: row.id,
      fleetId,
      name,
      score,
      createdAt: row.created_at,
      delta,
    };
  });
}
