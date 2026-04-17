import { notFound } from "next/navigation";
import { getClaim } from "@/app/actions/claims";
import { DefensePacketView } from "@/components/claims/defense-packet-view";

export const runtime = "nodejs";

export default async function ClaimDetailPage({
  params,
}: {
  params: { claimId: string };
}) {
  const claim = await getClaim(params.claimId);
  if (!claim) notFound();

  return (
    <DefensePacketView
      claimId={claim.id}
      claimNumber={claim.claimNumber}
      status={claim.status}
      packet={claim.packet}
    />
  );
}
