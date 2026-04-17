"use server";

import { randomUUID } from "node:crypto";
import {
  insertClaim,
  getClaim as getClaimRow,
  getClaimByNumber,
  listClaims as listClaimsRows,
  updateClaimStatus as updateStatus,
} from "@/lib/db/claims";
import { generateDefensePacket } from "@/lib/claims/generate-scenario";
import { buildDefenseNarrative } from "@/lib/claims/narrative";
import type { ClaimStatus, ClaimDisposition, DefensePacket, ScenarioId, ClaimRow } from "@/lib/claims/types";
import { listHeroFleetIds } from "@/lib/underwriting/hero-fleets";

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
  disposition: ClaimDisposition;
  packet: DefensePacket;
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
    disposition: row.disposition,
  };
}

function rowToWithPacket(row: ClaimRow): ClaimWithPacket {
  return {
    ...rowToListItem(row),
    packet: JSON.parse(row.defense_packet_json) as DefensePacket,
  };
}

export async function createClaim(input: {
  claimNumber: string;
  scenarioId?: ScenarioId;
  incidentAt?: string;
  incidentLocation?: string;
  driverName?: string;
  vehicleUnit?: string;
}): Promise<{ claimId: string }> {
  const heroIds = await listHeroFleetIds();

  let packet: DefensePacket;
  let fleetId: string;

  if (input.scenarioId) {
    packet = generateDefensePacket(input.scenarioId);
    fleetId = input.scenarioId === "KS-2026-0142" ? (heroIds[0] ?? "demo") : (heroIds[1] ?? "demo");
  } else {
    // Custom entry: build minimal packet from scenario 1 template, override fields
    packet = generateDefensePacket("KS-2026-0142");
    packet.claimNumber = input.claimNumber;
    packet.incidentAt = input.incidentAt ?? packet.incidentAt;
    packet.incidentLocation = input.incidentLocation ?? packet.incidentLocation;
    packet.driverName = input.driverName ?? packet.driverName;
    packet.vehicleUnit = input.vehicleUnit ?? packet.vehicleUnit;
    fleetId = heroIds[0] ?? "demo";
  }

  packet.defenseNarrative = buildDefenseNarrative(packet);

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
    disposition: packet.disposition,
    defensePacket: packet,
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
