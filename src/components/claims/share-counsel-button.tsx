"use client";

export function ShareCounselButton({ claimId }: { claimId: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const url = `${window.location.origin}/api/pdf/claims/${claimId}`;
        navigator.clipboard.writeText(url).then(() => alert("PDF link copied to clipboard"));
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition"
    >
      Share with counsel
    </button>
  );
}
