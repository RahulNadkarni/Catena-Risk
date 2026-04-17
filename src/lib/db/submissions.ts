import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { FleetDossier } from "@/lib/domain/fleet-dossier";
import type { PeerBenchmarks } from "@/lib/risk/peer-benchmarks";
import type { RiskScore } from "@/lib/risk/scoring";

export interface ProspectPayload {
  dotNumber?: string;
  mcNumber?: string;
  legalName?: string;
  estimatedFleetSize?: string;
  commodities?: string[];
  primaryStates?: string[];
  heroFleetLabel?: string;
}

export interface ApiTraceEntry {
  path: string;
  method: string;
  ms: number;
  status: number;
  at: string;
  label?: string;
}

export interface SubmissionRow {
  id: string;
  fleet_id: string;
  created_at: string;
  prospect_json: string;
  dossier_json: string;
  score_json: string;
  peer_benchmarks_json: string;
  api_trace_json: string;
  consent_simulated: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "submissions.db");

let dbInstance: Database.Database | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  ensureDataDir();
  dbInstance = new Database(DB_PATH);
  dbInstance.pragma("journal_mode = WAL");
  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      fleet_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      prospect_json TEXT NOT NULL,
      dossier_json TEXT NOT NULL,
      score_json TEXT NOT NULL,
      peer_benchmarks_json TEXT NOT NULL,
      api_trace_json TEXT NOT NULL DEFAULT '[]',
      consent_simulated INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export function insertSubmission(row: {
  id: string;
  fleetId: string;
  prospect: ProspectPayload;
  dossier: FleetDossier;
  score: RiskScore;
  peerBenchmarks: PeerBenchmarks;
  apiTrace: ApiTraceEntry[];
  consentSimulated: boolean;
}): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO submissions (
      id, fleet_id, created_at, prospect_json, dossier_json, score_json,
      peer_benchmarks_json, api_trace_json, consent_simulated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    row.id,
    row.fleetId,
    new Date().toISOString(),
    JSON.stringify(row.prospect),
    JSON.stringify(row.dossier),
    JSON.stringify(row.score),
    JSON.stringify(row.peerBenchmarks),
    JSON.stringify(row.apiTrace),
    row.consentSimulated ? 1 : 0,
  );
}

export function getSubmission(id: string): SubmissionRow | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM submissions WHERE id = ?`).get(id) as SubmissionRow | undefined;
}

export function listRecentSubmissions(limit = 10): SubmissionRow[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM submissions ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as SubmissionRow[];
}
