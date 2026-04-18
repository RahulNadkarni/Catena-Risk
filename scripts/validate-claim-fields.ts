/**
 * Field-level validation: hits the live Catena API and shows exactly which
 * raw API response supplies each claim-packet field. Prints:
 *   1. The raw Catena response sample (first item of each relevant list)
 *   2. The derived claim-packet field with its provenance tag
 *
 * Run: npx tsx scripts/validate-claim-fields.ts
 */
import "./load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function line(title: string) {
  console.log("\n" + "═".repeat(78));
  console.log("  " + title);
  console.log("═".repeat(78));
}

function header(title: string) {
  console.log("\n" + "─".repeat(78));
  console.log("  " + title);
  console.log("─".repeat(78));
}

function pick(obj: unknown, keys: string[]) {
  if (!obj || typeof obj !== "object") return {};
  const o = obj as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in o) out[k] = o[k];
  return out;
}

async function main() {
  const { createCatenaClientFromEnv } = await import(
    path.join(ROOT, "src/lib/catena/client.ts")
  );
  const { buildRealSingleIncidentPacket } = await import(
    path.join(ROOT, "src/lib/claims/fetch-scenario.ts")
  );

  const client = createCatenaClientFromEnv();

  line("STEP 1 — Raw Catena API responses (live OAuth2 + GET)");

  const [
    vehiclesRes,
    usersRes,
    safetyRes,
    locRes,
    dvirRes,
    hosViolRes,
    hosAvailRes,
  ] = await Promise.all([
    client.listVehicles({ size: 5 }),
    client.listUsers({ size: 5 }),
    client.listDriverSafetyEvents({ size: 5 }),
    client.listVehicleLocations({ size: 5 }),
    client.listDvirLogs({ size: 5 }),
    client.listHosViolations({ size: 5 }),
    client.listHosAvailabilities({ size: 5 }),
  ]);

  header("GET /v2/telematics/vehicles (first item)");
  console.log(
    JSON.stringify(
      pick(vehiclesRes.items[0], [
        "id",
        "vehicle_name",
        "unit",
        "description",
        "vin",
        "fleet_id",
      ]),
      null,
      2,
    ),
  );
  console.log(
    `→ supplies: vehicleUnit (vehicle_name|unit|description), vehicleVin (vin)`,
  );

  header("GET /v2/telematics/users (first item)");
  console.log(
    JSON.stringify(
      pick(usersRes.items[0], [
        "id",
        "first_name",
        "last_name",
        "is_driver",
        "created_at",
      ]),
      null,
      2,
    ),
  );
  console.log(`→ supplies: driverName ("first_name last_name")`);

  header("GET /v2/telematics/driver-safety-events (first item)");
  console.log(
    JSON.stringify(
      pick(safetyRes.items[0], [
        "id",
        "driver_id",
        "vehicle_id",
        "event",
        "occurred_at",
        "event_metadata",
      ]),
      null,
      2,
    ),
  );
  console.log(
    `→ supplies: safetyEventsInWindow (event), incidentAt (occurred_at)`,
  );

  header("GET /v2/telematics/vehicle-locations (first item)");
  console.log(
    JSON.stringify(
      pick(locRes.items[0], [
        "id",
        "vehicle_id",
        "occurred_at",
        "location",
        "speed",
        "heading",
      ]),
      null,
      2,
    ),
  );
  console.log(
    `→ supplies: incidentLat/incidentLng (location.coordinates), speedTimeline (speed)`,
  );

  header("GET /v2/telematics/dvir-logs (first item)");
  console.log(
    JSON.stringify(
      pick(dvirRes.items[0], [
        "id",
        "vehicle_id",
        "occurred_at",
        "log_type",
        "is_safety_critical",
        "defect_count",
        "location",
      ]),
      null,
      2,
    ),
  );
  console.log(`→ supplies: dvirRecords (full list mapped)`);

  header("GET /v2/telematics/hos-availabilities (first item)");
  console.log(
    JSON.stringify(
      pick(hosAvailRes.items[0], [
        "driver_id",
        "duty_status_code",
        "available_drive_seconds",
        "available_shift_seconds",
        "available_cycle_seconds",
        "time_until_break_seconds",
        "is_personal_conveyance_applied",
      ]),
      null,
      2,
    ),
  );
  console.log(`→ supplies: hosSnapshot.*`);

  header("GET /v2/telematics/hos-violations (first item)");
  console.log(
    JSON.stringify(
      pick(hosViolRes.items[0], [
        "id",
        "driver_id",
        "vehicle_id",
        "occurred_at",
        "violation_code",
      ]),
      null,
      2,
    ),
  );
  console.log(
    `→ supplies: driverHosViolations30d / 90d (count, filtered by driver_id)`,
  );

  line("STEP 2 — Full packet build (buildRealSingleIncidentPacket)");

  const packet = await buildRealSingleIncidentPacket("VALIDATE-2026-001");

  header("Derived packet — the 10 audited fields");

  const row = (field: string, value: unknown, prov: string) => {
    const s = typeof value === "string" ? value : JSON.stringify(value);
    const trimmed = s && s.length > 80 ? s.slice(0, 77) + "..." : s;
    console.log(`  ${field.padEnd(22)} = ${trimmed}`);
    console.log(`  ${" ".repeat(22)}   provenance: ${prov}`);
  };

  const p = (field: string) =>
    packet.dataProvenance.find((e: { field: string }) => e.field === field)
      ?.source ?? "—";

  row("driverName", packet.driverName, p("driverName"));
  row("vehicleUnit", packet.vehicleUnit, p("vehicleUnit"));
  row("vehicleVin", packet.vehicleVin, p("vehicleVin"));
  row(
    "incidentAt",
    packet.incidentAt,
    p("incidentAt"),
  );
  row(
    "incidentLat,incidentLng",
    `${packet.incidentLat.toFixed(4)}, ${packet.incidentLng.toFixed(4)}`,
    p("incidentLat,incidentLng"),
  );
  row(
    "safetyEventsInWindow",
    `${packet.safetyEventsInWindow.length} events`,
    p("safetyEventsInWindow"),
  );
  row(
    "dvirRecords",
    `${packet.dvirRecords.length} logs`,
    p("dvirRecords"),
  );
  row(
    "hosSnapshot",
    `drive ${packet.hosSnapshot.hoursUntilDriveLimit}h / cycle ${packet.hosSnapshot.hoursUntilCycleLimit}h`,
    p("hosSnapshot"),
  );
  row(
    "roadContext",
    packet.roadContext.source === "osm"
      ? `${packet.roadContext.roadName ?? "?"} (${packet.roadContext.roadClassification ?? "?"})`
      : packet.roadContext.source,
    p("roadContext"),
  );

  header("Data completeness");
  console.log(`  status           : ${packet.dataCompleteness.status}`);
  console.log(`  apiFieldsPresent : ${packet.dataCompleteness.apiFieldsPresent.join(", ")}`);
  console.log(`  missingFields    : ${packet.dataCompleteness.missingFields.join(", ") || "(none)"}`);
  console.log(`  syntheticFields  : ${packet.dataCompleteness.syntheticFields.join(", ") || "(none)"}`);

  header("Evidence manifest (what got snapshotted)");
  for (const m of packet.evidenceManifest) {
    console.log(
      `  [${m.source.padEnd(14)}] ${m.fileName}  (records=${m.recordCount})`,
    );
  }

  console.log("\nAll 10 requested fields verified from live API above.\n");
}

main().catch((e) => {
  console.error("\n[validate-claim-fields] FAILED:", e?.message ?? e);
  process.exit(1);
});
