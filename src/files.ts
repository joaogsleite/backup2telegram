/**
 * List files (documents) posted in a chat.
 * Called by ./index.ts - not directly executable.
 */
import { Api } from "teleproto";
import {
  getBotToken,
  getEnvTarget,
  getSessionStr,
  requireApiCredentials,
} from "./env.js";
import { formatBytes } from "./format.js";
import { getDocumentInfo } from "./media.js";
import { connectForUpload, createClient } from "./telegram.js";

export function printFilesUsage(): void {
  console.log(`Usage:
  ./src/index.ts files [target] [--limit <n>]

Lists documents in a chat as: <message-id> <size> <date> <filename>
The target defaults to TG_TARGET / TG_GROUP_ID from .env.

Examples:
  ./src/index.ts files
  ./src/index.ts files -4674583959 --limit 20`);
}

export async function runFiles(argv: string[]): Promise<void> {
  if (argv.includes("-h") || argv.includes("--help")) {
    printFilesUsage();
    return;
  }

  let limit = 50;
  const filtered: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") {
      limit = Number(argv[++i]);
    } else {
      filtered.push(argv[i]);
    }
  }
  if (!Number.isInteger(limit) || limit < 1) {
    console.error("--limit must be a positive integer");
    process.exit(1);
  }

  const target = filtered[0] ?? getEnvTarget();
  if (filtered.length > 1) {
    console.error(`Unexpected argument: ${filtered[1]}\n`);
    printFilesUsage();
    process.exit(1);
  }
  if (!target) {
    console.error("Missing target. Pass one or set TG_TARGET / TG_GROUP_ID in .env.\n");
    printFilesUsage();
    process.exit(1);
  }

  const { apiId, apiHash } = requireApiCredentials();
  const sessionStr = getSessionStr();
  const botToken = getBotToken();
  if (!sessionStr && !botToken) {
    console.error(
      "Missing TG_SESSION (user) or TG_BOT_TOKEN (bot). Run ./src/index.ts login once to generate TG_SESSION.",
    );
    process.exit(1);
  }

  const client = createClient(sessionStr, apiId, apiHash);
  try {
    await connectForUpload(client, { sessionStr, botToken });
    let count = 0;
    for await (const message of client.iterMessages(target, {
      limit,
      filter: new Api.InputMessagesFilterDocument(),
    })) {
      const info = getDocumentInfo(message as Api.Message);
      if (!info) continue;
      count++;
      const date = new Date(message.date * 1000).toISOString();
      console.log(
        `${message.id}  ${formatBytes(info.size).padStart(10)}  ${date}  ${info.fileName}`,
      );
    }
    if (count === 0) console.log("No files found.");
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    try {
      await client.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}
