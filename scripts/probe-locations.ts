import "./load-env";
import { createCatenaClientFromEnv } from "../src/lib/catena/client";

async function main() {
  const client = createCatenaClientFromEnv();
  const [live, locs, users] = await Promise.all([
    client.listVehicleLiveLocations({ size: 10 }),
    client.listVehicleLocations({ size: 5 }),
    client.listUsers({ size: 5 }),
  ]);
  console.log("=== LIVE LOCATIONS (first 3) ===");
  console.log(JSON.stringify((live?.items ?? []).slice(0,3), null, 2));
  console.log("=== VEHICLE LOCATIONS historical (first 2) ===");
  console.log(JSON.stringify((locs?.items ?? []).slice(0,2), null, 2));
  console.log("=== USERS (first 3) ===");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log(JSON.stringify((users?.items ?? []).slice(0,3).map((u:any)=>({id:u.id,first:u.first_name,last:u.last_name})), null, 2));
}
main().catch(console.error);
