/**
 * Integration test for CatenaClient's 429 retry behavior.
 *
 * We don't want to hit the real Catena sandbox in unit tests, so we inject a
 * sequenced axios adapter on the client's internal `apiHttp` instance and
 * verify the response interceptor honors Retry-After and transparently
 * retries the request.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { AxiosAdapter, AxiosResponse } from "axios";
import { CatenaClient } from "@/lib/catena/client";

beforeAll(() => {
  // Skip the OAuth exchange — the 429 interceptor lives on the API http
  // instance, not the auth instance, so a static token is enough.
  process.env.CATENA_ACCESS_TOKEN = "test-token-dont-use-in-prod";
});

/** Shape of the `listVehicles` response the client's Zod schema will accept. */
function vehiclesPage() {
  return {
    items: [
      {
        id: "00000000-0000-0000-0000-000000000001",
        vehicle_name: "test-vehicle",
        vin: "TESTVIN0001",
        fleet_id: "00000000-0000-0000-0000-000000000001",
      },
    ],
    next_page: null,
  };
}

function okResponse(data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: {} as any,
  };
}

function installSequencedAdapter(
  client: CatenaClient,
  sequence: Array<{ status: number; retryAfter?: string; body?: unknown }>,
): { callCount: () => number } {
  let calls = 0;
  const adapter: AxiosAdapter = async (config) => {
    const step = sequence[Math.min(calls, sequence.length - 1)]!;
    calls += 1;
    if (step.status >= 400) {
      // Axios treats >=400 as a rejection the interceptor can inspect.
      const err = new Error(`HTTP ${step.status}`) as Error & {
        config: typeof config;
        response: AxiosResponse;
        isAxiosError: true;
      };
      err.config = config;
      err.isAxiosError = true;
      err.response = {
        data: step.body ?? { detail: "rate limited" },
        status: step.status,
        statusText: "",
        headers: step.retryAfter ? { "retry-after": step.retryAfter } : {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config: config as any,
      };
      throw err;
    }
    return okResponse(step.body ?? vehiclesPage());
  };
  // Replace the adapter on the client's internal API axios instance.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).apiHttp.defaults.adapter = adapter;
  return { callCount: () => calls };
}

describe("CatenaClient — 429 retry", () => {
  it("retries once after a 429 with Retry-After: 0 and returns the successful body", async () => {
    const client = new CatenaClient({ accessToken: "test-token-dont-use-in-prod" });
    const probe = installSequencedAdapter(client, [
      { status: 429, retryAfter: "0" },
      { status: 200, body: vehiclesPage() },
    ]);

    const res = await client.listVehicles({ size: 1 });

    expect(probe.callCount()).toBe(2);
    expect(res.items[0]?.id).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("gives up after 5 consecutive 429s", async () => {
    const client = new CatenaClient({ accessToken: "test-token-dont-use-in-prod" });
    installSequencedAdapter(
      client,
      // 6 consecutive 429s — the interceptor caps retries at 5.
      Array.from({ length: 6 }, () => ({ status: 429, retryAfter: "0" })),
    );

    await expect(client.listVehicles({ size: 1 })).rejects.toThrow(/HTTP 429/);
  }, 15_000);
});
