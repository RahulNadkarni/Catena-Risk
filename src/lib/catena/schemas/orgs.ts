import { z } from "zod";
import { CursorPageResponseSchema } from "./pagination";
import { IsoDateTimeString } from "./primitives";

/** GET /v2/orgs/fleets/{fleet_id} — single fleet */
export const FleetReadSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().optional().nullable(),
    description: z.unknown().optional().nullable(),
    display_name: z.unknown().optional().nullable(),
    legal_name: z.unknown().optional().nullable(),
    dba_name: z.unknown().optional().nullable(),
    websites: z.array(z.string()).optional().nullable(),
    invitation_id: z.string().optional().nullable(),
    fleet_ref: z.string().optional().nullable(),
    regulatory_id: z.unknown().optional().nullable(),
    regulatory_id_type: z.unknown().optional().nullable(),
    regulatory_id_date: z.unknown().optional().nullable(),
    regulatory_id_status: z.unknown().optional().nullable(),
    registered_email: z.unknown().optional().nullable(),
    registered_phone: z.unknown().optional().nullable(),
    registered_fax: z.unknown().optional().nullable(),
    address: z.unknown().optional().nullable(),
    city: z.unknown().optional().nullable(),
    province: z.unknown().optional().nullable(),
    postal_code: z.unknown().optional().nullable(),
    country_code: z.unknown().optional().nullable(),
    created_at: IsoDateTimeString,
    updated_at: IsoDateTimeString,
  })
  .passthrough();

/** GET /v2/orgs/fleets */
export const ListFleetsResponseSchema = CursorPageResponseSchema(FleetReadSchema);

/** GET /v2/orgs/tsps */
export const TspReadSchema = z.object({ id: z.string().uuid() }).passthrough();
export const ListOrgsTspsResponseSchema = CursorPageResponseSchema(TspReadSchema);

export const InvitationReadSchema = z.object({ id: z.string().uuid() }).passthrough();
export const ListInvitationsResponseSchema = CursorPageResponseSchema(InvitationReadSchema);

export const ShareAgreementReadSchema = z.object({ id: z.string().uuid() }).passthrough();
export const ListShareAgreementsResponseSchema = CursorPageResponseSchema(ShareAgreementReadSchema);

export const PartnerReadSchema = z.object({ id: z.string().uuid() }).passthrough();
export const ListPartnersResponseSchema = CursorPageResponseSchema(PartnerReadSchema);

// --- operationId-aligned exports ---
export type GetFleetResponse = z.infer<typeof FleetReadSchema>;
export type ListFleetsResponse = z.infer<typeof ListFleetsResponseSchema>;
