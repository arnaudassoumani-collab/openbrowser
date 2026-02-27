import { test, expect } from "./fixtures";

type LlmConfig = {
  llm: string;
  authMode: string;
  modelName: string;
  npm: string;
  options: { baseURL: string };
  oauthClientId?: string;
  oauthScopes?: string;
  apiKey?: string;
  schemaVersion?: number;
};

const MATRIX: Array<{ name: string; config: LlmConfig }> = [
  {
    name: "legacy_ollama_api_key",
    config: {
      llm: "ollama",
      authMode: "api_key",
      modelName: "qwen3-vl:2b",
      npm: "@ai-sdk/openai-compatible",
      options: { baseURL: "http://127.0.0.1:11434/v1" },
      apiKey: "should_not_persist",
      schemaVersion: 1
    }
  },
  {
    name: "legacy_openai_direct",
    config: {
      llm: "openai",
      authMode: "api_key",
      modelName: "gpt-4.1-mini",
      npm: "@ai-sdk/openai",
      options: { baseURL: "https://api.openai.com/v1" },
      apiKey: "should_not_persist",
      schemaVersion: 1
    }
  },
  {
    name: "legacy_bridge_provider",
    config: {
      llm: "soca-bridge",
      authMode: "api_key",
      modelName: "soca/auto",
      npm: "@ai-sdk/openai-compatible",
      options: { baseURL: "http://127.0.0.1:9834/v1" },
      apiKey: "should_not_persist",
      schemaVersion: 1
    }
  }
];

test("Settings schema migration matrix normalizes persisted config", async ({
  extPage
}) => {
  for (const row of MATRIX) {
    await extPage.evaluate(
      async ({ nextConfig }) => {
        await chrome.storage.local.set({
          llmConfig: nextConfig,
          historyLLMConfig: { [nextConfig.llm]: nextConfig }
        });
      },
      { nextConfig: row.config }
    );

    await extPage.reload();
    await extPage.waitForLoadState("domcontentloaded");
    await expect(extPage.getByText("Settings")).toBeVisible();

    const stored = await extPage.evaluate(async () => {
      return await chrome.storage.local.get(["llmConfig", "historyLLMConfig"]);
    });

    const llmConfig = stored?.llmConfig || {};
    const history = stored?.historyLLMConfig || {};
    const historyEntry = history[String(llmConfig.llm || "")] || {};

    expect(Number(llmConfig.schemaVersion || 0)).toBeGreaterThanOrEqual(2);
    expect(String(llmConfig.apiKey || "")).toBe("");
    expect(["api_key", "oauth"]).toContain(String(llmConfig.authMode || ""));
    expect(typeof llmConfig.options).toBe("object");
    expect(typeof llmConfig.options?.baseURL).toBe("string");

    expect(Number(historyEntry.schemaVersion || 0)).toBeGreaterThanOrEqual(2);
    expect(String(historyEntry.apiKey || "")).toBe("");
  }
});

test("Settings page can save normalized local provider config", async ({
  extPage
}) => {
  await extPage.evaluate(async () => {
    await chrome.storage.local.set({
      llmConfig: {
        llm: "ollama",
        authMode: "api_key",
        modelName: "qwen3-vl:2b",
        npm: "@ai-sdk/openai-compatible",
        options: { baseURL: "http://127.0.0.1:11434/v1" },
        schemaVersion: 1,
        apiKey: "legacy"
      },
      historyLLMConfig: {}
    });
  });

  await extPage.reload();
  await extPage.waitForLoadState("domcontentloaded");
  await expect(extPage.getByText("Settings")).toBeVisible();

  await extPage.getByRole("button", { name: "Save Settings" }).click();
  await expect(extPage.getByText("Save Success!")).toBeVisible();

  const policyState = await extPage.evaluate(
    () =>
      new Promise((resolve) =>
        chrome.runtime.sendMessage(
          { type: "SOCA_GET_PROVIDER_POLICY_STATE" },
          (resp) => resolve(resp)
        )
      )
  );
  expect((policyState as any)?.ok).toBe(true);

  const stored = await extPage.evaluate(async () => {
    return await chrome.storage.local.get(["llmConfig"]);
  });
  expect(Number(stored?.llmConfig?.schemaVersion || 0)).toBeGreaterThanOrEqual(
    2
  );
});
