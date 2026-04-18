// ---------------------------------------------------------------------------
// Claim status — tracks data collection lifecycle, not legal outcome
// ---------------------------------------------------------------------------
export type ClaimStatus =
  | "open"
  | "under_review"
  | "data_collected"
  | "closed";

// ---------------------------------------------------------------------------
// Data completeness — what the system was able to gather
// ---------------------------------------------------------------------------
export type DataCompletenessStatus =
  | "COMPLETE"           // all primary Catena fields + enrichment present
  | "PARTIAL"            // some fields came from real API, others unavailable
  | "SYNTHETIC_FALLBACK" // API unavailable; core packet is synthetic demo data

export interface DataCompleteness {
  status: DataCompletenessStatus;
  /** Fields confirmed from a live API response */
  apiFieldsPresent: string[];
  /** Fields unavailable and left null */
  missingFields: string[];
  /** Fields synthesised for demo purposes */
  syntheticFields: string[];
}

// ---------------------------------------------------------------------------
// Data provenance — per-field source attribution
// ---------------------------------------------------------------------------
export type ProvenanceSource =
  | "catena_api"
  | "catena_analytics"
  | "catena_inferred"
  | "noaa"
  | "osm"
  | "fmcsa"
  | "synthetic"
  | "hardcoded";

export interface DataProvenanceEntry {
  field: string;
  source: ProvenanceSource;
  note?: string;
}

// ---------------------------------------------------------------------------
// Evidence manifest — SHA-256 chain-of-custody per data source
// ---------------------------------------------------------------------------
export interface EvidenceManifestEntry {
  id: string;
  fileName: string;
  description: string;
  source: ProvenanceSource;
  fetchedAt: string; // ISO 8601
  sha256: string;
  recordCount: number | null;
}

// ---------------------------------------------------------------------------
// External enrichment contexts
// ---------------------------------------------------------------------------

/** Weather conditions at incident time/location from NOAA api.weather.gov */
export interface WeatherContext {
  source: "noaa" | "unavailable";
  fetchedAt: string;
  stationId: string | null;
  stationName: string | null;
  stationDistanceKm: number | null;
  temperatureF: number | null;
  visibilityMiles: number | null;
  windSpeedMph: number | null;
  precipitationType: "none" | "rain" | "snow" | "freezing_rain" | "unknown" | null;
  precipitationIntensityInHr: number | null;
  roadCondition: "dry" | "wet" | "icy" | "snowy" | "unknown";
  conditionDescription: string | null;
  rawObservationUrl: string | null;
}

/** Road context at incident location from OSM Overpass (speed limits, road type) */
export interface RoadContext {
  source: "osm" | "catena_inferred" | "unavailable";
  fetchedAt: string;
  /** Posted speed limit in mph — null when OSM has no maxspeed tag */
  postedSpeedLimitMph: number | null;
  roadName: string | null;
  roadClassification:
    | "motorway"
    | "trunk"
    | "primary"
    | "secondary"
    | "tertiary"
    | "residential"
    | "service"
    | "unknown"
    | null;
  /** Human-readable address — from Catena inferred_address when available */
  inferredAddress: string | null;
  osmWayId: string | null;
}

/** FMCSA SAFER carrier record at date of loss */
export interface CarrierSafetyContext {
  source: "fmcsa" | "unavailable";
  fetchedAt: string;
  dotNumber: string | null;
  carrierName: string | null;
  safetyRating: "satisfactory" | "conditional" | "unsatisfactory" | "not_rated" | null;
  totalDrivers: number | null;
  totalPowerUnits: number | null;
  outOfServiceRateDrivers: number | null;  // 0–1
  outOfServiceRateVehicles: number | null; // 0–1
  crashTotal24m: number | null;
  injuryTotal24m: number | null;
  fatalTotal24m: number | null;
  /** Catena-derived: connections / TSPs as data provenance confirmation */
  catenaTspSources: string[];
}

// ---------------------------------------------------------------------------
// Core telematics types
// ---------------------------------------------------------------------------

export interface SpeedSample {
  offsetMinutes: number; // negative = before incident, 0 = at impact
  speedMph: number;
  lat: number;
  lng: number;
  /** true when value comes from a real Catena location ping */
  fromApi: boolean;
}

export interface ClaimSafetyEvent {
  id: string;
  type: "hard_brake" | "harsh_corner" | "speeding" | "distraction" | "forward_collision" | "other";
  severity: "low" | "medium" | "high";
  offsetMinutes: number;
  description: string;
  /** Raw event string from Catena API */
  rawEventType: string;
}

/** HOS status at time of incident — fields mapped directly from Catena hos-availabilities */
export interface HosSnapshot {
  // Drive window (11-hr rule)
  driveTimeUsedHours: number;
  driveTimeLimitHours: 11;
  hoursUntilDriveLimit: number;

  // Cycle window (70-hr/8-day rule)
  cycleUsedHours: number;
  cycleLimitHours: 70;
  hoursUntilCycleLimit: number;

  // Shift window
  availableShiftHours: number | null;  // available_shift_seconds / 3600

  // Break requirements
  timeUntilBreakHours: number | null;  // time_until_break_seconds / 3600
  nextBreakDueAt: string | null;       // next_break_due_at ISO

  // Status
  dutyStatusAtIncident: "driving" | "on_duty_not_driving" | "off_duty" | "sleeper_berth";
  isPersonalConveyance: boolean | null; // is_personal_conveyance_applied
  isCompliant: boolean;
  violationNote: string | null;

  // Ongoing violation duration when present
  cycleViolationDurationHours: number | null; // cycle_violation_duration_seconds / 3600

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
  inspectedAt: string;
  type: "pre_trip" | "post_trip" | "en_route";
  status: "satisfactory" | "unsatisfactory";
  defects: DvirDefect[];
  /** Vehicle or trailer ID from Catena */
  vehicleId: string | null;
  location: { lat: number; lng: number } | null;
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  occurredAt: string;
  speedMph: number;
  heading: number;
  fromApi: boolean;
}

// ---------------------------------------------------------------------------
// Main incident packet — replaces DefensePacket
// No legal strategy framing; objective evidence only
// ---------------------------------------------------------------------------
export interface IncidentPacket {
  // --- Identity ---
  claimNumber: string;
  incidentAt: string;      // ISO 8601
  incidentLocation: string; // human-readable, from RoadContext.inferredAddress when available
  incidentLat: number;
  incidentLng: number;
  incidentDescription: string;

  // --- Involved parties (from Catena users/vehicles) ---
  driverName: string;
  driverId: string | null;
  vehicleUnit: string;
  vehicleId: string | null;
  vehicleVin: string;
  /** Driver active since — derived from Catena user.started_at / created_at */
  driverTenureMonths: number;

  // --- Speed telemetry ---
  /** 72 samples at 1-min intervals ending at incident; real pings where available */
  speedTimeline: SpeedSample[];
  /** From RoadContext (OSM) — null when unavailable; never hardcoded */
  postedSpeedLimitMph: number | null;
  speedAtImpactMph: number;
  maxSpeedInWindowMph: number;

  // --- Pre-incident behavioral events (30-min window) ---
  safetyEventsInWindow: ClaimSafetyEvent[];

  // --- HOS at incident time ---
  hosSnapshot: HosSnapshot;
  /** HOS violations in 90-day window — count from Catena hos-violations */
  driverHosViolations90d: number;

  // --- DVIR inspection records (60 days prior) ---
  dvirRecords: DvirRecord[];

  // --- Route history (72h prior) ---
  routeWaypoints: RouteWaypoint[];

  // --- Trip origin: duty period start location (from oldest HOS event) ---
  tripOrigin: { lat: number; lng: number; locationName: string | null; cityName: string | null; at: string } | null;

  // --- Driver behavior summary from Catena analytics/drivers ---
  driverSafetyEvents30d: number | null;
  driverHosViolations30d: number | null;

  // --- External enrichment ---
  weatherContext: WeatherContext | null;
  roadContext: RoadContext | null;
  carrierContext: CarrierSafetyContext | null;

  // --- Evidence metadata ---
  incidentSummary: string;         // factual markdown narrative, no legal opinion
  dataCompleteness: DataCompleteness;
  dataProvenance: DataProvenanceEntry[];
  evidenceManifest: EvidenceManifestEntry[];
}

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------
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
  data_completeness: DataCompletenessStatus;
  incident_packet_json: string; // serialized IncidentPacket
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
  dataCompleteness: DataCompletenessStatus;
}

export type ScenarioId = "KS-2026-0142" | "KS-2026-0157";
