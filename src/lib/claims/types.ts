export type ClaimStatus =
  | "open"
  | "under_review"
  | "closed_exonerated"
  | "closed_settled";

export type ClaimDisposition =
  | "STRONG_DEFENSE_POSITION"
  | "UNFAVORABLE_EVIDENCE_CONSIDER_SETTLEMENT"
  | "NEUTRAL_FURTHER_INVESTIGATION";

export interface SpeedSample {
  offsetMinutes: number; // negative = before incident, 0 = at impact
  speedMph: number;
  lat: number;
  lng: number;
}

export interface ClaimSafetyEvent {
  id: string;
  type: "hard_brake" | "harsh_corner" | "speeding" | "distraction";
  severity: "low" | "medium" | "high";
  offsetMinutes: number; // relative to incident_at
  description: string;
}

export interface HosSnapshot {
  driveTimeUsedHours: number; // out of 11
  driveTimeLimitHours: 11;
  cycleUsedHours: number; // out of 70
  cycleLimitHours: 70;
  hoursUntilDriveLimit: number;
  hoursUntilCycleLimit: number;
  dutyStatusAtIncident: "driving" | "on_duty_not_driving" | "off_duty" | "sleeper_berth";
  isCompliant: boolean;
  violationNote: string | null;
  lastResetAt: string; // ISO 8601
}

export interface DvirDefect {
  id: string;
  component: string;
  severity: "critical" | "major" | "minor";
  resolvedAt: string | null;
  resolvedByName: string | null;
  note: string;
}

export interface DvirRecord {
  id: string;
  inspectedAt: string; // ISO 8601
  type: "pre_trip" | "post_trip" | "en_route";
  status: "satisfactory" | "unsatisfactory";
  defects: DvirDefect[];
}

export interface SyntheticFuelStop {
  id: string;
  occurredAt: string; // ISO 8601
  locationName: string;
  lat: number;
  lng: number;
  gallons: number;
  pricePerGallon: number;
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  occurredAt: string; // ISO 8601
  speedMph: number;
  heading: number;
}

export interface DefensePacket {
  // Identity
  claimNumber: string;
  incidentAt: string; // ISO 8601
  incidentLocation: string;
  incidentLat: number;
  incidentLng: number;
  incidentDescription: string;
  driverName: string;
  vehicleUnit: string;
  vehicleVin: string;

  // Speed telemetry (72 samples, 1-min intervals, ending at impact)
  speedTimeline: SpeedSample[];
  speedLimitMph: number;
  speedAtImpactMph: number;
  maxSpeedInWindowMph: number;

  // Behavioral events in the 30-min pre-incident window
  safetyEventsWindow: ClaimSafetyEvent[];

  // HOS at incident time
  hosSnapshot: HosSnapshot;

  // DVIR records (60 days prior)
  dvirRecords: DvirRecord[];

  // Route replay (72h prior, one waypoint per 15 min)
  routeWaypoints: RouteWaypoint[];

  // Fuel stops (synthetic — API unavailable)
  fuelStops: SyntheticFuelStop[];

  // Driver history
  driverSafetyScore: number; // 0–100
  driverHosViolations90d: number;
  driverTenureMonths: number;

  // Generated defense narrative (multi-paragraph markdown)
  defenseNarrative: string;

  // Disposition
  disposition: ClaimDisposition;
  dispositionRationale: string;
  dispositionFactors: string[];
}

export interface ClaimRow {
  id: string;
  claim_number: string;
  fleet_id: string;
  status: ClaimStatus;
  created_at: string;
  incident_at: string;
  incident_location: string;
  driver_name: string;
  vehicle_unit: string;
  disposition: ClaimDisposition;
  defense_packet_json: string; // serialized DefensePacket
}

export interface ClaimListItem {
  id: string;
  claimNumber: string;
  fleetId: string;
  status: ClaimStatus;
  createdAt: string;
  incidentAt: string;
  incidentLocation: string;
  driverName: string;
  vehicleUnit: string;
  disposition: ClaimDisposition;
}

export type ScenarioId = "KS-2026-0142" | "KS-2026-0157";
