/**
 * Permission set we request for underwriting consent, plus human-readable
 * labels for the UI. Kept out of the `"use server"` actions file because Next
 * only allows async-function exports from server-action modules.
 */
export const REQUESTED_PERMISSIONS: Record<string, string> = {
  vehicle: "read",
  vehicle_location: "read",
  user: "read",
  driver_safety_event: "read",
  hos_event: "read",
  hos_violation: "read",
  hos_availability: "read",
  hos_daily_snapshot: "read",
  dvir_log: "read",
  engine_log: "read",
};

export const PERMISSION_LABELS: Record<string, string> = {
  vehicle: "Vehicle roster",
  vehicle_location: "Vehicle locations & trips",
  user: "Drivers",
  driver_safety_event: "Driver safety events",
  hos_event: "Hours-of-service events",
  hos_violation: "HOS violations",
  hos_availability: "HOS availability",
  hos_daily_snapshot: "HOS daily snapshots",
  dvir_log: "DVIR logs",
  engine_log: "Engine diagnostics",
};

export interface FleetPreview {
  fleetId: string;
  fleet: {
    id: string;
    name: string | null;
    legalName: string | null;
    dbaName: string | null;
    fleetRef: string | null;
    regulatoryId: string | null;
    regulatoryIdType: string | null;
    websites: string[];
    address: string | null;
    city: string | null;
    province: string | null;
    countryCode: string | null;
    createdAt: string | null;
  } | null;
  connections: Array<{
    id: string;
    sourceName: string;
    status: string;
    updatedAt: string;
  }>;
  analytics: {
    vehicleCount: number | null;
    driverCount: number | null;
    trailerCount: number | null;
    /** "fixture" = numbers came from the committed hero-fixture bundle;
     *  "api" = from GET /analytics/overview on the sandbox; null = neither had data. */
    source: "fixture" | "api" | null;
    raw: Record<string, unknown> | null;
  };
  fixture: {
    rank: number | null;
    score: number | null;
    safetyEventCount: number;
    hosEventCount: number;
    dvirLogCount: number;
    locationCount: number;
    firstSeenAt: string | null;
    telematicsSources: string[];
  } | null;
  shareAgreements: Array<{
    id: string;
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
    permissions: Record<string, string>;
  }>;
  errors: string[];
}

export interface ConsentInvitationSummary {
  id: string | null;
  magicLink: string | null;
  expiresAt: string | null;
  status: string | null;
  partnerSlug: string | null;
}

export interface ConsentResult {
  ok: boolean;
  simulated: boolean;
  trace: import("@/lib/db/submissions").ApiTraceEntry[];
  consentError: string | null;
  invitation: ConsentInvitationSummary | null;
  activatedAgreement: { id: string; status: string } | null;
  requestedPermissions: Record<string, string>;
}

export interface DossierSummary {
  vehicleCount: number;
  driverCount: number;
  safetyEventCount: number;
  hosEventCount: number;
  hosViolationCount: number;
  dvirLogCount: number;
  dvirDefectCount: number;
  engineLogCount: number;
  vehicleLocationCount: number;
  connectionCount: number;
  windowStart: string;
  windowEnd: string;
  windowDays: number;
  totalApiCalls: number;
  totalLatencyMs: number;
  dataGaps: string[];
  riskScoreValue: number | null;
  riskScoreBand: string | null;
}
