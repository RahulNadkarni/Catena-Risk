"use client";

import { useState } from "react";
import Link from "next/link";
import type { DriverHosStatus } from "@/app/actions/dispatch";
import { DriverHosCard } from "./driver-hos-card";

interface Props {
  drivers: DriverHosStatus[];
}

function sortRank(d: DriverHosStatus): number {
  if (d.isInViolation) return 0;
  if (d.isNearLimit) return 1;
  const s = d.dutyStatus.toLowerCase();
  if (s === "driving") return 2;
  if (s.startsWith("on duty") || s === "yard moves") return 3;
  if (s === "sleeper") return 4;
  if (s === "personal conveyance") return 5;
  return 6; // off duty
}

function isOffDuty(d: DriverHosStatus): boolean {
  const s = d.dutyStatus.toLowerCase();
  return s === "off duty" || s === "unknown";
}

export function DriverBoard({ drivers }: Props) {
  const [showOffDuty, setShowOffDuty] = useState(false);

  const sorted = [...drivers].sort((a, b) => {
    const r = sortRank(a) - sortRank(b);
    return r !== 0 ? r : a.driverName.localeCompare(b.driverName);
  });

  const visible = showOffDuty ? sorted : sorted.filter((d) => !isOffDuty(d));
  const offDutyCount = sorted.filter(isOffDuty).length;

  return (
    <div className="space-y-3">
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active drivers — all drivers are off duty.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((d) => (
            <Link
              key={d.driverId}
              href={`/dispatch/${encodeURIComponent(d.driverId)}`}
              className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <DriverHosCard driver={d} />
            </Link>
          ))}
        </div>
      )}

      {offDutyCount > 0 && (
        <button
          type="button"
          onClick={() => setShowOffDuty((v) => !v)}
          className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {showOffDuty
            ? `Hide ${offDutyCount} off-duty driver${offDutyCount > 1 ? "s" : ""}`
            : `Show ${offDutyCount} off-duty driver${offDutyCount > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
