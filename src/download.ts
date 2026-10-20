/**
 * Download a file (document) from a chat by message id.
 * Called by ./index.ts - not directly executable.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  getBotToken,
  getEnvTarget,
  getSessionStr,
  requireApiCredentials,
} from "./env.js";
import { formatBytes } from "./format.js";
import { getDocumentInfo } from "./media.js";
import { createProgressBar } from "./progress.js";
import { connectForUpload, createClient } from "./telegram.js";

export function printDownloadUsage(): void {
  console.log(`Usage:
  ./src/index.ts download [target] <message-id> [output-path]

Downloads the document attached to a message. The target defaults to
TG_TARGET / TG_GROUP_ID from .env. Use the files command to find ids.
If output-path is a directory, the original filename is kept inside it.
Without output-path, the file is saved under its original name.

Examples:
  ./src/index.ts download 12345
  ./src/index.ts download -4674583959 12345 ./restored.tar.gz
  ./src/index.ts download -4674583959 12345 ~/Downloads/`);
}

export async function runDownload(argv: string[]): Promise<void> {
  if (argv.includes("-h") || argv.includes("--help")) {
    printDownloadUsage();
    return;
  }

  const positionals = argv.filter((a) => !a.startsWith("-"));
  const unknownFlag = argv.find(
    (a) => a.startsWith("-") && !/^-?\d+$/.test(a),
  );
  if (unknownFlag) {
    console.error(`Unknown option: ${unknownFlag}\n`);
    printDownloadUsage();
    process.exit(1);
  }

  let target: string | undefined;
  let idStr: string | undefined;
  let output: string | undefined;
  const envTarget = getEnvTarget();
  if (positionals.length === 3) {
    [target, idStr, output] = positionals;
  } else if (positionals.length === 2) {
    // With a default target configured, this is <message-id> <output-path>.
    if (envTarget) {
      target = envTarget;
      [idStr, output] = positionals;
    } else {
      [target, idStr] = positionals;
    }
  } else if (positionals.length === 1 && envTarget) {
    [idStr] = positionals;
    target = envTarget;
  } else {
    console.error("Missing arguments.\n");
    printDownloadUsage();
    process.exit(1);
  }

  const messageId = Number(idStr);
  if (!Number.isInteger(messageId) || messageId < 1) {
    console.error(`Invalid message id: ${idStr}`);
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
    const messages = await client.getMessages(target!, { ids: messageId });
    const message = messages[0];
    if (!message) {
      console.error(`No message with id ${messageId} in ${target}.`);
      process.exit(1);
    }
    const info = getDocumentInfo(message);
    if (!info) {
      console.error(`Message ${messageId} has no downloadable file.`);
      process.exit(1);
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
