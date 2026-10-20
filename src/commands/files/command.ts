/**
 * The files command: list documents posted in a chat.
 * Assumes validated args - see args.ts.
 */
import { Api } from "teleproto";
import { requireApiCredentials, requireAuth } from "../../helpers/env.js";
import { formatBytes } from "../../helpers/format.js";
import { getDocumentInfo } from "../../helpers/media.js";
import { connectForUpload, createClient } from "../../helpers/telegram.js";
import type { FilesArgs } from "./args.js";

export async function executeFiles(args: FilesArgs): Promise<void> {
  const { target, limit } = args;

  const { apiId, apiHash } = requireApiCredentials();
  const { sessionStr, botToken } = requireAuth();

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
  } finally {
    try {
      await client.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}
