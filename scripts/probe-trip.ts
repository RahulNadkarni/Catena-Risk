import "./load-env";
import { createCatenaClientFromEnv } from "../src/lib/catena/client";

async function main() {
  const client = createCatenaClientFromEnv();
  const [hosEvt, hosDaily, engLogs, ifta, safetyEvt, locs] = await Promise.all([
    client.listHosEvents({ size: 3 }),
    client.listHosDailySnapshots({ size: 3 }),
    client.listEngineLogs({ size: 3 }),
    client.listIftaSummaries({ size: 3 }),
    client.listDriverSafetyEvents({ size: 2 }),
    client.listVehicleLocations({ size: 3 }),
  ]);
  console.log("=== HOS EVENTS (first 2) ===");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log(JSON.stringify((hosEvt?.items ?? []).slice(0,2), null, 2));
  console.log("=== HOS DAILY SNAPSHOTS (first 1) ===");
  console.log(JSON.stringify((hosDaily?.items ?? []).slice(0,1), null, 2));
  console.log("=== ENGINE LOGS (first 1) ===");
  console.log(JSON.stringify((engLogs?.items ?? []).slice(0,1), null, 2));
  console.log("=== IFTA (first 1) ===");
  console.log(JSON.stringify((ifta?.items ?? []).slice(0,1), null, 2));
  console.log("=== SAFETY EVENT (full first record) ===");
  console.log(JSON.stringify((safetyEvt?.items ?? []).slice(0,1), null, 2));
  console.log("=== VEHICLE LOCATION (full first record) ===");
  console.log(JSON.stringify((locs?.items ?? []).slice(0,1), null, 2));
}
main().catch(console.error);
