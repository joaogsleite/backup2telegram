/**
 * The chats command: list dialogs with their upload-ready ids.
 * Assumes validated args - see args.ts.
 */
import { Api } from "teleproto";
import type { Dialog } from "teleproto/tl/custom/dialog";
import { requireApiCredentials, requireAuth } from "../../helpers/env.js";
import { connectForUpload, createClient } from "../../helpers/telegram.js";
import type { ChatsArgs } from "./args.js";

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

export async function executeChats(args: ChatsArgs): Promise<void> {
  const { apiId, apiHash } = requireApiCredentials();
  const { sessionStr, botToken } = requireAuth();

  const client = createClient(sessionStr, apiId, apiHash);
  try {
    await connectForUpload(client, { sessionStr, botToken });
    for await (const dialog of client.iterDialogs({ limit: args.limit })) {
      console.log(`${markedId(dialog)} (${peerType(dialog)}) ${dialog.title ?? "?"}`);
    }
  } finally {
    try {
      await client.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}
