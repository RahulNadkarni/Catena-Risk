import type { z } from "zod";

const isStrict =
  process.env.NODE_ENV === "development" || process.env.CATENA_DEBUG === "1";

function formatZodError(err: z.ZodError): unknown {
  return typeof err.flatten === "function" ? err.flatten() : err.message;
}

/**
 * Validates JSON from the Catena API. In development (or CATENA_DEBUG=1), invalid
 * responses throw. In production, failures are logged and the raw payload is returned
 * without throwing (caller treats shape as best-effort).
 */
export function validateApiResponse<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  if (isStrict) {
    return schema.parse(data);
  }
  const r = schema.safeParse(data);
  if (!r.success) {
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        label,
        message: "Catena API response failed schema validation",
        issues: formatZodError(r.error),
      }),
    );
    return data as T;
  }
  return r.data;
}
