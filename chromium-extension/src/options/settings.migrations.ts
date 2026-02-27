export const SETTINGS_SCHEMA_VERSION = 2;

const GOOGLE_OAUTH_DEFAULT_SCOPE =
  "https://www.googleapis.com/auth/generative-language";

type AnyRecord = Record<string, any>;

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeAuthMode(value: unknown): "api_key" | "oauth" {
  return String(value || "")
    .trim()
    .toLowerCase() === "oauth"
    ? "oauth"
    : "api_key";
}

function sanitizeLLMConfig(raw: unknown): AnyRecord | null {
  if (!isRecord(raw)) return null;
  const out: AnyRecord = { ...raw };

  out.schemaVersion = SETTINGS_SCHEMA_VERSION;
  out.llm = String(out.llm || "").trim();
  out.modelName = String(out.modelName || "").trim();
  out.authMode = normalizeAuthMode(out.authMode);
  out.oauthClientId = String(out.oauthClientId || "").trim();
  out.oauthScopes = String(out.oauthScopes || GOOGLE_OAUTH_DEFAULT_SCOPE)
    .trim()
    .replace(/\s+/g, " ");

  const options = isRecord(out.options) ? { ...out.options } : {};
  options.baseURL = String(options.baseURL || "").trim();
  out.options = options;

  // Session-only by policy. Keep local config secret-free.
  out.apiKey = "";

  return out;
}

export function migrateLLMConfig(raw: unknown): {
  value: AnyRecord | null;
  changed: boolean;
} {
  const migrated = sanitizeLLMConfig(raw);
  if (!migrated) return { value: null, changed: false };
  const changed = JSON.stringify(raw || {}) !== JSON.stringify(migrated);
  return { value: migrated, changed };
}

export function migrateHistoryLLMConfig(raw: unknown): {
  value: Record<string, AnyRecord>;
  changed: boolean;
} {
  if (!isRecord(raw)) return { value: {}, changed: Boolean(raw) };

  let changed = false;
  const out: Record<string, AnyRecord> = {};
  for (const [key, value] of Object.entries(raw)) {
    const migrated = sanitizeLLMConfig(value);
    if (!migrated) {
      changed = true;
      continue;
    }
    if (JSON.stringify(value || {}) !== JSON.stringify(migrated)) {
      changed = true;
    }
    out[key] = migrated;
  }
  if (JSON.stringify(raw) !== JSON.stringify(out)) {
    changed = true;
  }
  return { value: out, changed };
}

export function validateLLMConfig(raw: unknown): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    return { ok: false, errors: ["Config is not an object"] };
  }
  if (!String(raw.llm || "").trim()) errors.push("llm is required");
  if (!String(raw.modelName || "").trim()) errors.push("modelName is required");
  const authMode = normalizeAuthMode(raw.authMode);
  if (!["api_key", "oauth"].includes(authMode)) {
    errors.push("authMode must be api_key or oauth");
  }
  if (raw.options != null && !isRecord(raw.options)) {
    errors.push("options must be an object");
  }
  return { ok: errors.length === 0, errors };
}
