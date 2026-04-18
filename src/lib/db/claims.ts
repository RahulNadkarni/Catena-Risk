import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { ClaimRow, ClaimStatus, DataCompletenessStatus, IncidentPacket } from "@/lib/claims/types";

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

const CLAIMS_COLUMNS = `
    id                    TEXT PRIMARY KEY,
    claim_number          TEXT NOT NULL UNIQUE,
    fleet_id              TEXT NOT NULL,
    status                TEXT NOT NULL DEFAULT 'open',
    created_at            TEXT NOT NULL,
    incident_at           TEXT NOT NULL,
    incident_location     TEXT NOT NULL,
    driver_name           TEXT NOT NULL,
    vehicle_unit          TEXT NOT NULL,
    data_completeness     TEXT NOT NULL DEFAULT 'SYNTHETIC_FALLBACK',
    incident_packet_json  TEXT NOT NULL
`;

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS claims (${CLAIMS_COLUMNS});
    CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);
  `);

  const cols = (db.prepare("PRAGMA table_info(claims)").all() as { name: string }[]).map((c) => c.name);

  // Column rename migrations (safe, SQLite ≥ 3.25)
  if (cols.includes("defense_packet_json") && !cols.includes("incident_packet_json")) {
    db.exec(`ALTER TABLE claims RENAME COLUMN defense_packet_json TO incident_packet_json;`);
  }

  // If old `disposition` column exists, do a full table migration to remove it.
  // SQLite cannot DROP COLUMN (before 3.35) or ALTER constraints, so we recreate.
  if (cols.includes("disposition")) {
    db.exec(`
      BEGIN;
      CREATE TABLE claims_new (
        id                    TEXT PRIMARY KEY,
        claim_number          TEXT NOT NULL UNIQUE,
        fleet_id              TEXT NOT NULL,
        status                TEXT NOT NULL DEFAULT 'open',
        created_at            TEXT NOT NULL,
        incident_at           TEXT NOT NULL,
        incident_location     TEXT NOT NULL,
        driver_name           TEXT NOT NULL,
        vehicle_unit          TEXT NOT NULL,
        data_completeness     TEXT NOT NULL DEFAULT 'SYNTHETIC_FALLBACK',
        incident_packet_json  TEXT NOT NULL
      );
      INSERT INTO claims_new
        SELECT id, claim_number, fleet_id, status, created_at, incident_at,
               incident_location, driver_name, vehicle_unit,
               COALESCE(data_completeness, disposition, 'SYNTHETIC_FALLBACK'),
               incident_packet_json
        FROM claims;
      DROP TABLE claims;
      ALTER TABLE claims_new RENAME TO claims;
      CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);
      COMMIT;
    `);
  } else if (!cols.includes("data_completeness")) {
    db.exec(`ALTER TABLE claims ADD COLUMN data_completeness TEXT NOT NULL DEFAULT 'SYNTHETIC_FALLBACK';`);
  }
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
  dataCompleteness: DataCompletenessStatus;
  incidentPacket: IncidentPacket;
}

export function insertClaim(input: InsertClaimInput): void {
  const db = getClaimsDb();
  db.prepare(`
    INSERT OR IGNORE INTO claims (
      id, claim_number, fleet_id, status, created_at,
      incident_at, incident_location, driver_name, vehicle_unit,
      data_completeness, incident_packet_json
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
    input.dataCompleteness,
    JSON.stringify(input.incidentPacket),
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
