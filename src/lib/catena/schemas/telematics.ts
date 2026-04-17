import { z } from "zod";
import { CursorPageResponseSchema } from "./pagination";
import { IsoDateTimeString } from "./primitives";

/** Minimal identify + passthrough so new Catena fields don't break validation */
const TelematicsRow = z.object({ id: z.string().uuid(), fleet_id: z.string().uuid() }).passthrough();

export const VehicleReadSchema = TelematicsRow;

export const UserReadSchema = TelematicsRow;

export const DriverSafetyEventReadSchema = TelematicsRow.extend({
  driver_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  event: z.string(),
}).passthrough();

export const VehicleLocationReadSchema = TelematicsRow.extend({
  vehicle_id: z.string().uuid(),
  occurred_at: IsoDateTimeString,
  odometer: z.number().optional().nullable(),
  engine_hours: z.number().optional().nullable(),
  driver_id: z.string().uuid().optional().nullable(),
  h3_index_11: z.union([z.string(), z.number()]).optional().nullable(),
}).passthrough();

export const HosEventReadSchema = TelematicsRow.extend({
  driver_id: z.string().uuid(),
  vehicle_id: z.string().uuid().optional().nullable(),
  time_zone_code: z.string().optional().nullable(),
  event_type_code: z.string().optional().nullable(),
  event_code: z.string().optional().nullable(),
  duty_status_code: z.string().optional().nullable(),
  started_at: IsoDateTimeString.optional().nullable(),
  occurred_at: IsoDateTimeString.optional(),
}).passthrough();

export const HosViolationReadSchema = TelematicsRow.passthrough();

export const HosDailySnapshotReadSchema = TelematicsRow.passthrough();

export const HosAvailabilityReadSchema = TelematicsRow.passthrough();

export const DvirLogReadSchema = TelematicsRow.passthrough();

export const DvirDefectReadSchema = TelematicsRow.extend({
  severity: z.string().optional().nullable(),
}).passthrough();

export const EngineLogReadSchema = TelematicsRow.passthrough();

export const ListVehiclesResponseSchema = CursorPageResponseSchema(VehicleReadSchema);
export const ListUsersResponseSchema = CursorPageResponseSchema(UserReadSchema);
export const ListDriverSafetyEventsResponseSchema = CursorPageResponseSchema(DriverSafetyEventReadSchema);
export const ListVehicleLocationsResponseSchema = CursorPageResponseSchema(VehicleLocationReadSchema);
export const ListHosEventsResponseSchema = CursorPageResponseSchema(HosEventReadSchema);
export const ListHosViolationsResponseSchema = CursorPageResponseSchema(HosViolationReadSchema);
export const ListHosDailySnapshotsResponseSchema = CursorPageResponseSchema(HosDailySnapshotReadSchema);
export const ListHosAvailabilitiesResponseSchema = CursorPageResponseSchema(HosAvailabilityReadSchema);
export const ListDvirLogsResponseSchema = CursorPageResponseSchema(DvirLogReadSchema);
export const ListDvirDefectsResponseSchema = CursorPageResponseSchema(DvirDefectReadSchema);
export const ListEngineLogsResponseSchema = CursorPageResponseSchema(EngineLogReadSchema);

export const AnalyticsOverviewResponseSchema = z.union([z.record(z.string(), z.unknown()), z.null()]);

export type VehicleRead = z.infer<typeof VehicleReadSchema>;
export type UserRead = z.infer<typeof UserReadSchema>;
export type DriverSafetyEventRead = z.infer<typeof DriverSafetyEventReadSchema>;
export type VehicleLocationRead = z.infer<typeof VehicleLocationReadSchema>;
export type HosEventRead = z.infer<typeof HosEventReadSchema>;
export type HosViolationRead = z.infer<typeof HosViolationReadSchema>;
export type HosDailySnapshotRead = z.infer<typeof HosDailySnapshotReadSchema>;
export type HosAvailabilityRead = z.infer<typeof HosAvailabilityReadSchema>;
export type DvirLogRead = z.infer<typeof DvirLogReadSchema>;
export type DvirDefectRead = z.infer<typeof DvirDefectReadSchema>;
export type EngineLogRead = z.infer<typeof EngineLogReadSchema>;
