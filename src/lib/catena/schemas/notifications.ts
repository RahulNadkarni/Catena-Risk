import { z } from "zod";
import { CursorPageResponseSchema } from "./pagination";

/** Minimal placeholder schemas for notifications surface (optional Phase 1 coverage) */
export const WebhookReadSchema = z.object({ id: z.string().uuid() }).passthrough();

export const ListWebhooksResponseSchema = CursorPageResponseSchema(WebhookReadSchema);

export const NotificationSchemaMetadataResponseSchema = z.record(z.string(), z.unknown());
