/**
 * Upload files to a Telegram group/channel/chat using teleproto (MTProto).
 * Called by ./index.ts - not directly executable.
 */
import { existsSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { TelegramClient } from "teleproto";
import {
  getBotToken,
  getEnvTarget,
  getSessionStr,
  requireApiCredentials,
} from "./env.js";
import { formatBytes, formatDuration } from "./format.js";
import { createProgressBar } from "./progress.js";
import { connectForUpload, createClient } from "./telegram.js";

type Args = {
  target?: string;
  files: string[];
  caption?: string;
  workers: number;
  forceDocument: boolean;
  silent: boolean;
  help: boolean;
};

export function printUploadUsage(): void {
  console.log(`Usage:
  ./src/index.ts upload <target> <file...> [options]
  npx tsx ./src/index.ts upload <target> <file...> [options]

Arguments:
  <target>              @username, numeric id, invite link, phone, or "me"
  <file...>             one or more local file paths to upload

Options:
  --caption <text>      caption applied to each file
  --workers <n>         parallel upload chunks (default 4, 1-16)
  --force-document      send as generic file, skip photo/video detection (default)
  --no-force-document   let Telegram render photos/videos as media
  --silent              send without notification sound
  -h, --help            show this help

Env:
  TG_API_ID, TG_API_HASH, TG_SESSION (or TG_STRING_SESSION), TG_BOT_TOKEN, TG_TARGET

Examples:
  ./src/index.ts upload @mygroup ./backup.tar.gz
  ./src/index.ts upload -123456789 ./a.zip ./b.sql --caption "nightly backup" --workers 8
  TG_TARGET=@mygroup ./src/index.ts upload ./a.zip`);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    files: [],
    workers: 4,
    forceDocument: true,
    silent: false,
    help: false,
  };
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      args.help = true;
    } else if (a === "--caption") {
      args.caption = argv[++i] ?? "";
    } else if (a.startsWith("--caption=")) {
      args.caption = a.slice("--caption=".length);
    } else if (a === "--workers") {
      args.workers = Number(argv[++i]);
    } else if (a.startsWith("--workers=")) {
      args.workers = Number(a.slice("--workers=".length));
    } else if (a === "--force-document") {
      args.forceDocument = true;
    } else if (a === "--no-force-document") {
      args.forceDocument = false;
    } else if (a === "--silent") {
      args.silent = true;
    } else if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}\n`);
      printUploadUsage();
      process.exit(1);
    } else {
      positionals.push(a);
    }
  }
  const envTarget = getEnvTarget();
  if (args.help) return args;
  if (positionals.length === 0 && envTarget) {
    console.error("Missing <file...>\n");
    printUploadUsage();
    process.exit(1);
  }
  if (positionals.length >= 2) {
    args.target = positionals[0];
    args.files = positionals.slice(1);
  } else if (positionals.length === 1 && envTarget) {
    args.target = envTarget;
    args.files = positionals;
  } else if (positionals.length === 1 && !envTarget) {
    console.error("Missing <target> and <file...>\n");
    printUploadUsage();
    process.exit(1);
  }
  return args;
}

export async function runUpload(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    printUploadUsage();
    return;
  }
  if (!Number.isInteger(args.workers) || args.workers < 1 || args.workers > 16) {
    console.error("--workers must be an integer between 1 and 16");
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
  if (!args.target) {
    console.error("Missing upload target.");
    printUploadUsage();
    process.exit(1);
  }
  for (const f of args.files) {
    if (!existsSync(f) || !statSync(f).isFile()) {
      console.error(`Not a file: ${f}`);
      process.exit(1);
    }
  }

  const client = createClient(sessionStr, apiId, apiHash);

  try {
    await connectForUpload(client, { sessionStr, botToken });
    console.log(`Target: ${args.target}`);
    for (const f of args.files) {
      const abs = resolve(f);
      const size = statSync(abs).size;
      const name = basename(abs);
      const startedAt = Date.now();

      console.log(`Uploading ${name} (${formatBytes(size)})...`);
      const bar = createProgressBar("", size);
      const msg = await client.sendFile(args.target!, {
        file: abs,
        caption: args.caption,
        workers: args.workers,
        forceDocument: args.forceDocument,
        silent: args.silent || undefined,
        // teleproto calls this with a single fraction 0..1.
        progressCallback: (fraction: unknown) => bar.update(fraction),
      } as Parameters<TelegramClient["sendFile"]>[1]);
      bar.finish();
      console.log(`  sent in ${formatDuration(Date.now() - startedAt)} as message id ${msg.id}`);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    try {
      await client.disconnect();
    } catch {
      // ignore disconnect errors after a failed run
    }
  }
}
