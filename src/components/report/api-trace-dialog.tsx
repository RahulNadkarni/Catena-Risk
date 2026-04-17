"use client";

import type { ApiTraceEntry } from "@/lib/db/submissions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ApiTraceDialog({ entries }: { entries: ApiTraceEntry[] }) {
  return (
    <Dialog>
      <DialogTrigger>
        <Button type="button" variant="outline" size="sm">
          View API trace
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>API trace</DialogTitle>
          <DialogDescription>Recorded HTTP calls for this submission (consent + dossier timings).</DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">ms</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={`${e.path}-${e.at}-${i}`}>
                  <TableCell className="text-xs">{e.label ?? "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate font-mono text-xs">{e.path}</TableCell>
                  <TableCell className="text-xs">{e.method}</TableCell>
                  <TableCell className="text-right text-xs metric-tabular">{e.ms}</TableCell>
                  <TableCell className="text-right text-xs metric-tabular">{e.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
