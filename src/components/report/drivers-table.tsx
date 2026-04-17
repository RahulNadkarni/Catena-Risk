"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DriverSummaryRow = {
  user_id: string;
  name: string;
  safety_events_30d: number;
  hos_violations_30d: number;
  status: string;
  grade: string;
};

function gradeFrom(safety: number, hos: number): string {
  const penalty = safety * 2 + hos * 3;
  if (penalty === 0) return "A";
  if (penalty <= 3) return "B";
  if (penalty <= 8) return "C";
  if (penalty <= 15) return "D";
  return "F";
}

export function DriversTable({
  rows,
  submissionId,
}: {
  rows: DriverSummaryRow[];
  submissionId: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(needle) || r.user_id.toLowerCase().includes(needle));
  }, [rows, q]);

  const columns = useMemo<ColumnDef<DriverSummaryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Driver
            <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden />
          </Button>
        ),
        cell: ({ row }) => (
          <Link
            className="text-primary font-medium hover:underline"
            href={`/underwriting/${submissionId}/driver/${row.original.user_id}`}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "safety_events_30d",
        header: "Safety (30d)",
        cell: ({ row }) => <span className="metric-tabular">{row.original.safety_events_30d}</span>,
      },
      {
        accessorKey: "hos_violations_30d",
        header: "HOS viol. (30d)",
        cell: ({ row }) => <span className="metric-tabular">{row.original.hos_violations_30d}</span>,
      },
      {
        accessorKey: "grade",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Grade
            <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden />
          </Button>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
      },
    ],
    [submissionId],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-3">
      <Input placeholder="Search drivers…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} aria-sort={h.column.getIsSorted() ? (h.column.getIsSorted() === "desc" ? "descending" : "ascending") : "none"}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-muted-foreground h-24 text-center">
                  No drivers for this fleet filter.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function mapRawDrivers(items: Record<string, unknown>[], fleetId: string): DriverSummaryRow[] {
  const out: DriverSummaryRow[] = [];
  for (const raw of items) {
    if (raw.fleet_id !== fleetId) continue;
    const userId = typeof raw.user_id === "string" ? raw.user_id : "";
    if (!userId) continue;
    const fn = typeof raw.first_name === "string" ? raw.first_name : "";
    const ln = typeof raw.last_name === "string" ? raw.last_name : "";
    const name = [fn, ln].filter(Boolean).join(" ") || userId;
    const safety = Number(raw.safety_events_30d ?? 0);
    const hos = Number(raw.hos_violations_30d ?? 0);
    const status = typeof raw.status === "string" ? raw.status : "—";
    out.push({
      user_id: userId,
      name,
      safety_events_30d: Number.isFinite(safety) ? safety : 0,
      hos_violations_30d: Number.isFinite(hos) ? hos : 0,
      status,
      grade: gradeFrom(Number.isFinite(safety) ? safety : 0, Number.isFinite(hos) ? hos : 0),
    });
  }
  return out;
}
