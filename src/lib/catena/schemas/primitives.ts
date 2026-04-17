import { z } from "zod";

/** ISO-8601 timestamps from API (some clients may omit strict Z suffix) */
export const IsoDateTimeString = z.string();

export const UuidString = z.string().uuid();

export const Nullable = <T extends z.ZodTypeAny>(inner: T) => z.union([inner, z.null()]);

/** Arbitrary JSON object blobs from providers */
export const JsonObject = z.record(z.string(), z.unknown());
