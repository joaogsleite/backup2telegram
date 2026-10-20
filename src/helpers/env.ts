import { existsSync, readFileSync } from "node:fs";

/** Load `.env` (cwd) without extra dependencies. Existing env vars win. */
export function loadDotEnv(path = ".env"): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function getApiCredentials(): { apiId: number; apiHash: string } {
  const apiId = Number(process.env.TG_API_ID ?? process.env.API_ID);
  const apiHash = process.env.TG_API_HASH ?? process.env.API_HASH ?? "";
  return { apiId, apiHash };
}

/** Exits the process when TG_API_ID / TG_API_HASH are missing or invalid. */
export function requireApiCredentials(): { apiId: number; apiHash: string } {
  const { apiId, apiHash } = getApiCredentials();
  if (!Number.isInteger(apiId) || !apiHash) {
    console.error(
      "Missing TG_API_ID / TG_API_HASH. Create an app at https://my.telegram.org, then export them or put them in .env.",
    );
    process.exit(1);
  }
  return { apiId, apiHash };
}

export function getSessionStr(): string {
  return (
    process.env.TG_SESSION ||
    process.env.TG_STRING_SESSION ||
    process.env.SESSION ||
    ""
  );
}

export function getBotToken(): string {
  return process.env.TG_BOT_TOKEN || process.env.BOT_TOKEN || "";
}

/** Exits unless a user session or bot token is configured. */
export function requireAuth(): { sessionStr: string; botToken: string } {
  const sessionStr = getSessionStr();
  const botToken = getBotToken();
  if (!sessionStr && !botToken) {
    console.error(
      "Missing TG_SESSION (user) or TG_BOT_TOKEN (bot). Run ./src/index.ts login once to generate TG_SESSION.",
    );
    process.exit(1);
  }
  return { sessionStr, botToken };
}

export function getEnvTarget(): string {
  return process.env.TG_TARGET || process.env.TG_GROUP || process.env.TG_CHAT || "";
}
