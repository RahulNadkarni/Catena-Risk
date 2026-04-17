"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowUpDown, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RiskScore } from "@/lib/risk/scoring";

export interface PortfolioFleetRow {
  submissionId: string;
  fleetId: string;
  name: string;
  score: RiskScore;
  createdAt: string;
  /** delta from prior submission, if any */
  delta: number | null;
}

const TIER_COLOR: Record<string, string> = {
  Preferred: "bg-emerald-600",
  Standard: "bg-blue-600",
  Substandard: "bg-amber-500",
  Decline: "bg-destructive",
};

function TierBadge({ tier }: { tier: string }) {
  return <Badge className={`${TIER_COLOR[tier] ?? "bg-muted"} text-white text-xs`}>{tier}</Badge>;
}

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-muted-foreground text-xs">—</span>;
  const sign = delta > 0 ? "+" : "";
  const color = delta > 0 ? "text-emerald-600" : delta < -10 ? "text-destructive font-semibold" : "text-amber-600";
  return (
    <span className={`flex items-center gap-1 text-sm ${color}`}>
      {delta < -10 && <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
      {sign}{delta.toFixed(0)} pts
    </span>
  );
}

interface Props {
  rows: PortfolioFleetRow[];
}

export function PortfolioFleetTable({ rows }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }]);

  const columns = useMemo<ColumnDef<PortfolioFleetRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Fleet",
        cell: ({ row }) => (
          <Link
            href={`/underwriting/${row.original.submissionId}`}
            className="text-primary text-sm font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "score",
        accessorFn: (r) => r.score.compositeScore,
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Score
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" aria-hidden />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="metric-tabular text-sm font-semibold">
            {Math.round(row.original.score.compositeScore)}/100
          </span>
        ),
      },
      {
        accessorKey: "tier",
        accessorFn: (r) => r.score.tier,
        header: "Tier",
        cell: ({ row }) => <TierBadge tier={row.original.score.tier} />,
      },
      {
        id: "topRisk",
        header: "Top risk factor",
        cell: ({ row }) => {
          const top = row.original.score.topRiskDrivers[0];
          if (!top) return <span className="text-muted-foreground text-xs">—</span>;
          const label = top.category.replace(/([A-Z])/g, " $1").toLowerCase();
          return <span className="text-sm capitalize">{label}</span>;
        },
      },
      {
        id: "delta",
        header: "30d trend",
        cell: ({ row }) => <DeltaCell delta={row.original.delta} />,
      },
      {
        id: "action",
        header: "",
        cell: ({ row }) => (
          <Link
            href={`/underwriting/${row.original.submissionId}`}
            className="text-primary text-xs hover:underline"
          >
            View report →
          </Link>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No scored fleets. Run <code className="mx-1 font-mono text-xs">npm run rehearse</code> to pre-score all demo fleets.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-muted/40">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
