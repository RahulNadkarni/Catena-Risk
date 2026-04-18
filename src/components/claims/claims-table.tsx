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
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClaimListItem, ClaimStatus } from "@/lib/claims/types";

function statusBadge(status: ClaimStatus) {
  const map: Record<ClaimStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    open: { label: "Open", variant: "default" },
    under_review: { label: "Under review", variant: "secondary" },
    data_collected: { label: "Data collected", variant: "outline" },
    closed: { label: "Closed", variant: "outline" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={variant}>{label}</Badge>;
}

export function ClaimsTable({ claims }: { claims: ClaimListItem[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "incidentAt", desc: true }]);

  const columns = useMemo<ColumnDef<ClaimListItem>[]>(
    () => [
      {
        accessorKey: "claimNumber",
        header: "Claim #",
        cell: ({ row }) => (
          <Link
            href={`/claims/${row.original.id}`}
            className="text-primary font-mono text-sm font-medium hover:underline"
          >
            {row.original.claimNumber}
          </Link>
        ),
      },
      {
        accessorKey: "incidentAt",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Incident date
            <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="metric-tabular text-sm">
            {format(new Date(row.original.incidentAt), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        accessorKey: "incidentLocation",
        header: "Location",
        cell: ({ row }) => <span className="text-sm">{row.original.incidentLocation}</span>,
      },
      {
        accessorKey: "driverName",
        header: "Driver",
        cell: ({ row }) => <span className="text-sm">{row.original.driverName}</span>,
      },
      {
        accessorKey: "vehicleUnit",
        header: "Vehicle",
        cell: ({ row }) => <span className="text-sm font-mono">{row.original.vehicleUnit}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: claims,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (claims.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No claims yet. Run <code className="mx-1 text-xs">npm run seed:claims</code> or file a new claim.
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
                <TableHead key={h.id} aria-sort={h.column.getIsSorted() ? (h.column.getIsSorted() === "desc" ? "descending" : "ascending") : "none"}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="cursor-pointer hover:bg-muted/40">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
