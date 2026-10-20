/**
 * The upload command: plan inputs (packing folders/large files as needed),
 * then send each file. Assumes validated args - see args.ts.
 */
import { statSync } from "node:fs";
import { basename } from "node:path";
import type { TelegramClient } from "teleproto";
import {
  getBotToken,
  getSessionStr,
  requireApiCredentials,
  requireAuth,
} from "../../helpers/env.js";
import { formatBytes, formatDuration } from "../../helpers/format.js";
import { cleanupPlan, planUploads } from "../../helpers/plan.js";
import type { PackedArchive } from "../../helpers/pack.js";
import { createProgressBar } from "../../helpers/progress.js";
import { connectForUpload, createClient } from "../../helpers/telegram.js";
import type { Args } from "./args.js";

export async function executeUpload(
  args: Args,
  volumeBytes: number,
): Promise<void> {
  const { apiId, apiHash } = requireApiCredentials();
  const { sessionStr, botToken } =
    args.dryRun
      ? { sessionStr: getSessionStr(), botToken: getBotToken() }
      : requireAuth();

  let packed: PackedArchive[] = [];
  try {
    const plan = await planUploads(args.files, {
      volumeSize: args.volumeSize,
      volumeBytes,
      level: args.level,
      workDir: args.workDir,
      caption: args.caption,
      dryRun: args.dryRun,
    });
    packed = plan.packed;

    if (args.dryRun) {
      console.log(`Target: ${args.target}`);
      for (const item of plan.items) {
        if (item.path.startsWith("(packed from ")) {
          console.log(
            `  pack ${item.path.slice("(packed from ".length, -1)} -> .7z (split past ${args.volumeSize})`,
          );
        } else {
          const size = statSync(item.path).size;
          console.log(
            `  send ${item.path} (${formatBytes(size)})${item.caption ? ` caption: ${item.caption}` : ""}`,
          );
        }
      }
      return;
    }

    const client = createClient(sessionStr, apiId, apiHash);
    try {
      await connectForUpload(client, { sessionStr, botToken });
      console.log(`Target: ${args.target}`);
      for (const item of plan.items) {
        const size = statSync(item.path).size;
        const name = basename(item.path);
        const startedAt = Date.now();

        console.log(`Uploading ${name} (${formatBytes(size)})...`);
        const bar = createProgressBar("", size);
        const msg = await client.sendFile(args.target!, {
          file: item.path,
          caption: item.caption,
          workers: args.workers,
          forceDocument: args.forceDocument,
          silent: args.silent || undefined,
          // teleproto calls this with a single fraction 0..1.
          progressCallback: (fraction: unknown) => bar.update(fraction),
        } as Parameters<TelegramClient["sendFile"]>[1]);
        bar.finish();
        console.log(`  sent in ${formatDuration(Date.now() - startedAt)} as message id ${msg.id}`);
      }
    } finally {
      try {
        await client.disconnect();
      } catch {
        // ignore disconnect errors after a failed run
      }
    }
  } finally {
    cleanupPlan(packed, args.keepArchive);
  }
}
