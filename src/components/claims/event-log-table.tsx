"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClaimSafetyEvent } from "@/lib/claims/types";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  hard_brake: "Hard Brake",
  harsh_corner: "Harsh Corner",
  speeding: "Speeding",
  distraction: "Distraction",
};

function offsetLabel(minutes: number): string {
  if (minutes === 0) return "Impact";
  const abs = Math.abs(minutes);
  const m = Math.floor(abs);
  const s = Math.round((abs - m) * 60);
  return s > 0 ? `T-${m}m ${s}s` : `T-${m}m`;
}

function severityClass(severity: string): string {
  if (severity === "high") return "text-destructive font-semibold";
  if (severity === "medium") return "text-amber-600 font-medium";
  return "text-muted-foreground";
}

interface Props {
  events: ClaimSafetyEvent[];
}

export function EventLogTable({ events }: Props) {
  const columns = useMemo<ColumnDef<ClaimSafetyEvent>[]>(
    () => [
      {
        accessorKey: "offsetMinutes",
        header: "Time",
        cell: ({ row }) => (
          <span className="metric-tabular text-sm">{offsetLabel(row.original.offsetMinutes)}</span>
        ),
      },
      {
        accessorKey: "type",
        header: "Event type",
        cell: ({ row }) => <span>{TYPE_LABEL[row.original.type] ?? row.original.type}</span>,
      },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row }) => (
          <span className={cn("capitalize text-sm", severityClass(row.original.severity))}>
            {row.original.severity}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.description}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: events,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (events.length === 0) {
    return (
      <p className="text-sm font-medium text-success py-3">
        No safety events recorded in this window — favorable defense evidence.
      </p>
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
            <TableRow key={row.id}>
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
