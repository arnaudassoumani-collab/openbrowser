import { expect, test } from "playwright/test";

import {
  bridgeFetchJson,
  resolveBridgeProvider,
  SOCA_BRIDGE_CONFIG_STORAGE_KEY,
  SOCA_BRIDGE_TOKEN_SESSION_KEY,
  SOCA_LANE_STORAGE_KEY,
  SOCA_TOOLS_CONFIG_STORAGE_KEY,
  SOCA_VPS_HOLO_CONFIG_STORAGE_KEY
} from "../src/background/bridge-client";

type KeyValueStore = Record<string, unknown>;

const LOCAL_BASE_URL = "http://127.0.0.1:9834";
const VPS_BASE_URL = "https://soca-vps.tailf1b21d.ts.net/bridge";

test.describe("resolveBridgeProvider", () => {
  test("uses explicit providerId before llmConfig", () => {
    expect(resolveBridgeProvider("vps-holo", { llm: "soca-bridge" })).toBe(
      "vps-holo"
    );
  });

  test("falls back to llmConfig when explicit provider is invalid", () => {
    expect(resolveBridgeProvider("unknown", { llm: "vps_holo" })).toBe(
      "vps-holo"
    );
  });

  test("defaults to soca-bridge when no valid value is provided", () => {
    expect(resolveBridgeProvider(undefined, { llm: "openai" })).toBe(
      "soca-bridge"
    );
    expect(resolveBridgeProvider(undefined, undefined)).toBe("soca-bridge");
  });
});

test.describe("bridgeFetchJson provider isolation", () => {
  let originalChrome: unknown;
  let originalFetch: typeof globalThis.fetch;
  let localStore: KeyValueStore;
  let sessionStore: KeyValueStore;
  let fetchCalls: Array<{ url: string; auth: string }>;

  test.beforeEach(() => {
    originalChrome = (globalThis as any).chrome;
    originalFetch = globalThis.fetch;
    fetchCalls = [];

    localStore = {
      llmConfig: { llm: "soca-bridge" },
      [SOCA_LANE_STORAGE_KEY]: "OB_OFFLINE",
      [SOCA_BRIDGE_CONFIG_STORAGE_KEY]: {
        bridgeBaseURL: LOCAL_BASE_URL,
        dnrGuardrailsEnabled: true
      },
      [SOCA_VPS_HOLO_CONFIG_STORAGE_KEY]: {
        bridgeBaseURL: VPS_BASE_URL,
        dnrGuardrailsEnabled: true
      },
      [SOCA_TOOLS_CONFIG_STORAGE_KEY]: {
        allowlistText: "",
        mcp: {}
      }
    };
    sessionStore = {
      [SOCA_BRIDGE_TOKEN_SESSION_KEY]: "bridge-test-token"
    };

    (globalThis as any).chrome = {
      runtime: { id: "test-extension-id" },
      storage: {
        local: {
          async get(keys: string[] | string) {
            if (typeof keys === "string") {
              return { [keys]: localStore[keys] };
            }
            const out: KeyValueStore = {};
            for (const key of keys) out[key] = localStore[key];
            return out;
          }
        },
        session: {
          async get(keys: string[] | string) {
            if (typeof keys === "string") {
              return { [keys]: sessionStore[keys] };
            }
            const out: KeyValueStore = {};
            for (const key of keys) out[key] = sessionStore[key];
            return out;
          }
        }
      }
    };

    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => {
      const url = String(input);
      const auth = String(
        (init?.headers as Record<string, string> | undefined)?.Authorization ||
          ""
      );
      fetchCalls.push({ url, auth });
      return new Response(
        JSON.stringify({
          object: "list",
          data: [{ id: "ok" }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof globalThis.fetch;
  });

  test.afterEach(() => {
    (globalThis as any).chrome = originalChrome;
    globalThis.fetch = originalFetch;
  });

  test("explicit providerId selects the matching bridge URL every call", async () => {
    await bridgeFetchJson(
      "/v1/models",
      { method: "GET" },
      { providerId: "vps-holo" }
    );
    await bridgeFetchJson(
      "/v1/models",
      { method: "GET" },
      { providerId: "soca-bridge" }
    );
    await bridgeFetchJson(
      "/v1/models",
      { method: "GET" },
      { providerId: "vps-holo" }
    );

    expect(fetchCalls.map((call) => call.url)).toEqual([
      `${VPS_BASE_URL}/v1/models`,
      `${LOCAL_BASE_URL}/v1/models`,
      `${VPS_BASE_URL}/v1/models`
    ]);
    expect(fetchCalls.map((call) => call.auth)).toEqual([
      "Bearer bridge-test-token",
      "Bearer bridge-test-token",
      "Bearer bridge-test-token"
    ]);
  });

  test("storage-inferred provider follows active llmConfig per request", async () => {
    localStore.llmConfig = { llm: "soca-bridge" };
    await bridgeFetchJson("/v1/models", { method: "GET" });

    localStore.llmConfig = { llm: "vps_holo" };
    await bridgeFetchJson("/v1/models", { method: "GET" });

    expect(fetchCalls.map((call) => call.url)).toEqual([
      `${LOCAL_BASE_URL}/v1/models`,
      `${VPS_BASE_URL}/v1/models`
    ]);
  });
});
