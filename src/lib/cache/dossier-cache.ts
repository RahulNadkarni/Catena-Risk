import type { CatenaClient } from "@/lib/catena/client";
import { buildFleetDossier } from "@/lib/domain/fleet-dossier";

type CacheKey = string;

const TTL_MS = 60 * 60 * 1000;

const store = new Map<CacheKey, { value: Awaited<ReturnType<typeof buildFleetDossier>>; expires: number }>();

function key(parts: { fleetId: string; source: "api" | "fixtures"; windowDays: number; maxPages: number; pageSize: number }) {
  return `${parts.fleetId}|${parts.source}|${parts.windowDays}|${parts.maxPages}|${parts.pageSize}`;
}

export async function getCachedFleetDossier(
  fleetId: string,
  opts: {
    source?: "api" | "fixtures";
    windowDays?: number;
    pagination?: { maxPages?: number; pageSize?: number };
    client?: CatenaClient;
  },
): Promise<Awaited<ReturnType<typeof buildFleetDossier>>> {
  const source = opts.source ?? "api";
  const windowDays = opts.windowDays ?? 90;
  const maxPages = opts.pagination?.maxPages ?? 1;
  const pageSize = opts.pagination?.pageSize ?? 150;
  const k = key({ fleetId, source, windowDays, maxPages, pageSize });
  const now = Date.now();
  const hit = store.get(k);
  if (hit && hit.expires > now) {
    return hit.value;
  }
  const dossier = await buildFleetDossier(fleetId, {
    source,
    windowDays,
    pagination: { maxPages, pageSize },
    client: opts.client,
  });
  store.set(k, { value: dossier, expires: now + TTL_MS });
  return dossier;
}

export function invalidateDossierCache(fleetId?: string) {
  if (!fleetId) {
    store.clear();
    return;
  }
  for (const k of store.keys()) {
    if (k.startsWith(`${fleetId}|`)) store.delete(k);
  }
}
