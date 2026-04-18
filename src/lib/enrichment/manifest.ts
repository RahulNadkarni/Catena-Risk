/**
 * Evidence manifest builder — SHA-256 chain-of-custody per data source.
 *
 * Hashes JSON blobs at collection time so downstream consumers can verify
 * data integrity. Follows NIST/SWGDE chain-of-custody standard:
 * SHA-256 hash at acquisition + logged transfer timestamps.
 *
 * These hashes support FRE 902(13)–(14) self-authentication of electronic records.
 */

import { createHash } from "node:crypto";
import type { EvidenceManifestEntry, ProvenanceSource } from "@/lib/claims/types";

function sha256(data: unknown): string {
  const json = typeof data === "string" ? data : JSON.stringify(data, null, 0);
  return createHash("sha256").update(json, "utf8").digest("hex");
}

interface ManifestEntryInput {
  id: string;
  fileName: string;
  description: string;
  source: ProvenanceSource;
  data: unknown;
  recordCount?: number | null;
}

export function buildManifestEntry(input: ManifestEntryInput): EvidenceManifestEntry {
  return {
    id: input.id,
    fileName: input.fileName,
    description: input.description,
    source: input.source,
    fetchedAt: new Date().toISOString(),
    sha256: sha256(input.data),
    recordCount: input.recordCount ?? null,
  };
}

export function buildManifest(entries: ManifestEntryInput[]): EvidenceManifestEntry[] {
  return entries.map(buildManifestEntry);
}
