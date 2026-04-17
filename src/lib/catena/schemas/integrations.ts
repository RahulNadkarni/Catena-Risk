import { z } from "zod";
import { CursorPageResponseSchema } from "./pagination";
import { IsoDateTimeString } from "./primitives";

export const ConnectionCredentialsSchema = z.record(z.string(), z.unknown()).optional();

/** GET /v2/integrations/connections/{id} and list item */
export const ConnectionReadSchema = z
  .object({
    id: z.string().uuid(),
    created_at: IsoDateTimeString,
    updated_at: IsoDateTimeString,
    fleet_id: z.string().uuid(),
    fleet_ref: z.string().optional().nullable(),
    tsp_id: z.string().uuid(),
    source_name: z.string(),
    credentials: ConnectionCredentialsSchema.nullable().optional(),
    status: z.string(),
    description: z.string().optional().nullable(),
  })
  .passthrough();

export const ListConnectionsResponseSchema = CursorPageResponseSchema(ConnectionReadSchema);

export type ConnectionRead = z.infer<typeof ConnectionReadSchema>;
export type ListConnectionsResponse = z.infer<typeof ListConnectionsResponseSchema>;
