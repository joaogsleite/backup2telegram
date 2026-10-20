/**
 * List chats (dialogs) visible to the account, with their upload-ready ids.
 * Called by ./index.ts - not directly executable.
 */
import { Api } from "teleproto";
import type { Dialog } from "teleproto/tl/custom/dialog";
import {
  getBotToken,
  getSessionStr,
  requireApiCredentials,
} from "./env.js";
import { connectForUpload, createClient } from "./telegram.js";

export function printChatsUsage(): void {
  console.log(`Usage:
  ./src/index.ts chats [--limit <n>]

Prints your chats as: <marked-id> (<type>) <title>
Use the marked id as the upload target, e.g.:
  ./src/index.ts upload -1001234567890 ./backup.tar.gz`);
}

function markedId(dialog: Dialog): string {
  const id = dialog.id?.toString() ?? "?";
  if (id.startsWith("-")) return id;
  if (dialog.isChannel) return `-100${id}`;
  if (dialog.isGroup) return `-${id}`;
  return id;
}

function peerType(dialog: Dialog): string {
  if (dialog.isChannel) {
    const entity = dialog.entity as Api.Channel | undefined;
    return entity && !entity.broadcast ? "supergroup" : "channel";
  }
  if (dialog.isGroup) return "group";
  if (dialog.isUser) return "user";
  return "unknown";
}

export async function runChats(argv: string[]): Promise<void> {
  if (argv.includes("-h") || argv.includes("--help")) {
    printChatsUsage();
    return;
  }
  let limit = 100;
  const li = argv.indexOf("--limit");
  if (li !== -1) {
    limit = Number(argv[li + 1]);
    if (!Number.isInteger(limit) || limit < 1) {
      console.error("--limit must be a positive integer");
      process.exit(1);
    }
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
    for await (const dialog of client.iterDialogs({ limit })) {
      console.log(`${markedId(dialog)} (${peerType(dialog)}) ${dialog.title ?? "?"}`);
    }
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
