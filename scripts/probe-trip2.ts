import "./load-env";
import { createCatenaClientFromEnv } from "../src/lib/catena/client";

async function main() {
  const client = createCatenaClientFromEnv();
  
  // HOS events - trip timeline
  try {
    const hosEvt = await client.listHosEvents({ size: 2 });
    console.log("=== HOS EVENTS (first 2) ===");
    console.log(JSON.stringify((hosEvt?.items ?? []).slice(0,2), null, 2));
  } catch(e: unknown) { console.log("HOS EVENTS ERR:", (e as Error).message?.slice(0,80)); }

  // HOS daily snapshots
  try {
    const hosDaily = await client.listHosDailySnapshots({ size: 1 });
    console.log("=== HOS DAILY SNAPSHOTS (first 1) ===");
    console.log(JSON.stringify((hosDaily?.items ?? []).slice(0,1), null, 2));
  } catch(e: unknown) { console.log("HOS DAILY ERR:", (e as Error).message?.slice(0,80)); }

  // Engine logs
  try {
    const engLogs = await client.listEngineLogs({ size: 1 });
    console.log("=== ENGINE LOGS (first 1) ===");
    console.log(JSON.stringify((engLogs?.items ?? []).slice(0,1), null, 2));
  } catch(e: unknown) { console.log("ENGINE LOGS ERR:", (e as Error).message?.slice(0,80)); }

  // Driver summaries  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const driverSumm = await (client as any).listDriverSummaries({ size: 1 });
    console.log("=== DRIVER SUMMARIES (first 1) ===");
    console.log(JSON.stringify((driverSumm?.items ?? []).slice(0,1), null, 2));
  } catch(e: unknown) { console.log("DRIVER SUMM ERR:", (e as Error).message?.slice(0,80)); }
}
main().catch(console.error);
