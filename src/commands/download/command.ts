/**
 * The download command: fetch a message by id and save its attached file.
 * Assumes validated args - see args.ts.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { requireApiCredentials, requireAuth } from "../../helpers/env.js";
import { formatBytes } from "../../helpers/format.js";
import { getDocumentInfo } from "../../helpers/media.js";
import { createProgressBar } from "../../helpers/progress.js";
import { connectForUpload, createClient } from "../../helpers/telegram.js";
import type { DownloadArgs } from "./args.js";

export async function executeDownload(args: DownloadArgs): Promise<void> {
  const { target, messageId, output } = args;

  const { apiId, apiHash } = requireApiCredentials();
  const { sessionStr, botToken } = requireAuth();

  const client = createClient(sessionStr, apiId, apiHash);
  try {
    await connectForUpload(client, { sessionStr, botToken });
    const messages = await client.getMessages(target, { ids: messageId });
    const message = messages[0];
    if (!message) {
      throw new Error(`No message with id ${messageId} in ${target}.`);
    }
    const info = getDocumentInfo(message);
    if (!info) {
      throw new Error(`Message ${messageId} has no downloadable file.`);
    }

    let outPath = output ?? info.fileName;
    if (existsSync(outPath) && statSync(outPath).isDirectory()) {
      outPath = join(outPath, info.fileName);
    }

    console.log(`Downloading ${info.fileName} (${formatBytes(info.size)})...`);
    const bar = createProgressBar("", info.size);
    const result = await client.downloadMedia(message, {
      outputFile: outPath,
      progressCallback: (downloaded, total) =>
        bar.update(downloaded, total),
    });
    bar.finish();
    console.log(`  saved to ${typeof result === "string" ? result : outPath}`);
  } finally {
    try {
      await client.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}
