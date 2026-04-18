"use server";

import { randomUUID } from "node:crypto";
import {
  insertClaim,
  getClaim as getClaimRow,
  getClaimByNumber,
  listClaims as listClaimsRows,
  updateClaimStatus as updateStatus,
} from "@/lib/db/claims";
import { buildRealSingleIncidentPacket } from "@/lib/claims/fetch-scenario";
import type {
  ClaimStatus,
  IncidentPacket,
  ClaimRow,
  ClaimListItem,
} from "@/lib/claims/types";
import { listHeroFleetIds } from "@/lib/underwriting/hero-fleets";

export type { ClaimListItem } from "@/lib/claims/types";

export interface ClaimWithPacket {
  id: string;
  claimNumber: string;
  fleetId: string;
  status: ClaimStatus;
  createdAt: string;
  incidentAt: string;
  incidentLocation: string;
  driverName: string;
  vehicleUnit: string;
  dataCompleteness: string;
  packet: IncidentPacket;
}

function rowToListItem(row: ClaimRow): ClaimListItem {
  return {
    id: row.id,
    claimNumber: row.claim_number,
    fleetId: row.fleet_id,
    status: row.status,
    createdAt: row.created_at,
    incidentAt: row.incident_at,
    incidentLocation: row.incident_location,
    driverName: row.driver_name,
    vehicleUnit: row.vehicle_unit,
    dataCompleteness: row.data_completeness,
  };
}

function rowToWithPacket(row: ClaimRow): ClaimWithPacket {
  return {
    ...rowToListItem(row),
    packet: JSON.parse(row.incident_packet_json) as IncidentPacket,
  };
}

export async function createClaim(input: {
  claimNumber: string;
  dispatchVehicleId?: string;
}): Promise<{ claimId: string }> {
  const heroIds = await listHeroFleetIds();

  const packet: IncidentPacket = await buildRealSingleIncidentPacket(input.claimNumber, {
    dispatchVehicleId: input.dispatchVehicleId,
  });
  const fleetId = heroIds[0] ?? "demo";

  const claimId = randomUUID();
  insertClaim({
    id: claimId,
    claimNumber: packet.claimNumber,
    fleetId,
    status: "open",
    incidentAt: packet.incidentAt,
    incidentLocation: packet.incidentLocation,
    driverName: packet.driverName,
    vehicleUnit: packet.vehicleUnit,
    dataCompleteness: packet.dataCompleteness.status,
    incidentPacket: packet,
  });

  return { claimId };
}

export async function getClaim(id: string): Promise<ClaimWithPacket | null> {
  const row = getClaimRow(id);
  if (!row) return null;
  return rowToWithPacket(row);
}

export async function getClaimByClaimNumber(claimNumber: string): Promise<ClaimWithPacket | null> {
  const row = getClaimByNumber(claimNumber);
  if (!row) return null;
  return rowToWithPacket(row);
}

export async function listClaims(): Promise<ClaimListItem[]> {
  return listClaimsRows(50).map(rowToListItem);
}

export async function updateClaimStatus(id: string, status: ClaimStatus): Promise<void> {
  updateStatus(id, status);
}
