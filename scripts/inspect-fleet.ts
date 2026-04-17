/**
 * CLI summary for a fleet dossier and derived metrics.
 * Usage: npx tsx scripts/inspect-fleet.ts <fleetId>
 * Set CATENA_INSPECT_SOURCE=fixtures to load src/lib/fixtures/fleets instead of the API.
 */
import "./load-env";
import { buildFleetDossier } from "../src/lib/domain/fleet-dossier";
import { computeBehaviorRates, computeExposureMetrics } from "../src/lib/domain/derived-metrics";

const fleetId = process.argv[2];
if (!fleetId) {
  // eslint-disable-next-line no-console
  console.error("Usage: npx tsx scripts/inspect-fleet.ts <fleetId>");
  process.exit(1);
}

const source = process.env.CATENA_INSPECT_SOURCE === "fixtures" ? "fixtures" : "api";

async function main() {
  const dossier = await buildFleetDossier(fleetId, { source });
  const exposure = computeExposureMetrics(dossier);
  const behavior = computeBehaviorRates(dossier, exposure);

  // eslint-disable-next-line no-console
  console.log("Catena fleet dossier");
  // eslint-disable-next-line no-console
  console.table([
    { field: "fleetId", value: dossier.fleetId },
    { field: "source", value: dossier.source },
    {
      field: "window",
      value: `${dossier.window.start} → ${dossier.window.end}`,
    },
    { field: "fetchedAt", value: dossier.meta.fetchedAt },
    { field: "totalApiCalls", value: String(dossier.meta.totalApiCalls) },
    { field: "totalLatencyMs", value: String(dossier.meta.totalLatencyMs) },
    { field: "vehicles", value: String(dossier.vehicles.length) },
    { field: "users", value: String(dossier.users.length) },
    { field: "safetyEvents", value: String(dossier.safetyEvents.length) },
    { field: "vehicleLocations", value: String(dossier.vehicleLocations.length) },
    { field: "hosEvents", value: String(dossier.hosEvents.length) },
    { field: "hosViolations", value: String(dossier.hosViolations.length) },
    { field: "connections", value: String(dossier.connections.length) },
    { field: "driverVehiclePairs", value: String(dossier.driverVehicleAssociations.length) },
  ]);

  // eslint-disable-next-line no-console
  console.log("\nEndpoint timings (ms)");
  // eslint-disable-next-line no-console
  console.table(dossier.meta.endpointTimings);

  // eslint-disable-next-line no-console
  console.log("\nExposure metrics");
  // eslint-disable-next-line no-console
  console.table(exposure as unknown as Record<string, string | number | null>);

  // eslint-disable-next-line no-console
  console.log("\nBehavior rates");
  // eslint-disable-next-line no-console
  console.table(behavior as unknown as Record<string, string | number | null>);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
