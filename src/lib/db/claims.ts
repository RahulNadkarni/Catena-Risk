import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { ClaimRow, ClaimStatus, ClaimDisposition, DefensePacket } from "@/lib/claims/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "submissions.db");

let dbInstance: Database.Database | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getClaimsDb(): Database.Database {
  if (dbInstance) return dbInstance;
  ensureDataDir();
  dbInstance = new Database(DB_PATH);
  dbInstance.pragma("journal_mode = WAL");
  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS claims (
      id                   TEXT PRIMARY KEY,
      claim_number         TEXT NOT NULL UNIQUE,
      fleet_id             TEXT NOT NULL,
      status               TEXT NOT NULL DEFAULT 'open',
      created_at           TEXT NOT NULL,
      incident_at          TEXT NOT NULL,
      incident_location    TEXT NOT NULL,
      driver_name          TEXT NOT NULL,
      vehicle_unit         TEXT NOT NULL,
      disposition          TEXT NOT NULL,
      defense_packet_json  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);
  `);
}

export interface InsertClaimInput {
  id: string;
  claimNumber: string;
  fleetId: string;
  status: ClaimStatus;
  incidentAt: string;
  incidentLocation: string;
  driverName: string;
  vehicleUnit: string;
  disposition: ClaimDisposition;
  defensePacket: DefensePacket;
}

export function insertClaim(input: InsertClaimInput): void {
  const db = getClaimsDb();
  db.prepare(`
    INSERT OR IGNORE INTO claims (
      id, claim_number, fleet_id, status, created_at,
      incident_at, incident_location, driver_name, vehicle_unit,
      disposition, defense_packet_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.claimNumber,
    input.fleetId,
    input.status,
    new Date().toISOString(),
    input.incidentAt,
    input.incidentLocation,
    input.driverName,
    input.vehicleUnit,
    input.disposition,
    JSON.stringify(input.defensePacket),
  );
}

export function getClaim(id: string): ClaimRow | undefined {
  return getClaimsDb()
    .prepare(`SELECT * FROM claims WHERE id = ?`)
    .get(id) as ClaimRow | undefined;
}

export function getClaimByNumber(claimNumber: string): ClaimRow | undefined {
  return getClaimsDb()
    .prepare(`SELECT * FROM claims WHERE claim_number = ?`)
    .get(claimNumber) as ClaimRow | undefined;
}

export function listClaims(limit = 50): ClaimRow[] {
  return getClaimsDb()
    .prepare(`SELECT * FROM claims ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as ClaimRow[];
}

export function updateClaimStatus(id: string, status: ClaimStatus): void {
  getClaimsDb()
    .prepare(`UPDATE claims SET status = ? WHERE id = ?`)
    .run(status, id);
}
