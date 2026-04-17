import { z } from "zod";

/**
 * Cursor-paginated list responses (`items` + optional `total` + cursor fields).
 * `.passthrough()` keeps forward compatibility if Catena adds fields.
 */
export function CursorPageResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .object({
      items: z.array(itemSchema),
      total: z.number().optional(),
      current_page: z.string().nullable().optional(),
      current_page_backwards: z.string().nullable().optional(),
      previous_page: z.string().nullable().optional(),
      next_page: z.string().nullable().optional(),
    })
    .passthrough();
}
