#!/usr/bin/env -S npx --no-install tsx
/**
 * backup2telegram - upload files to Telegram via teleproto (MTProto).
 *
 *   ./src/index.ts upload <target> <file...> [options]
 *   ./src/index.ts login
 *   npm run upload -- <target> <file...> [options]
 *   npm run login
 *
 * No global installs needed: `npm install` provides ./node_modules/.bin/tsx
 * and the shebang above resolves it via `npx --no-install tsx` locally.
 */
import { loadDotEnv } from "./env.js";
import { runList } from "./list.js";
import { runLogin } from "./login.js";
import { printUploadUsage, runUpload } from "./upload.js";

loadDotEnv();

function printUsage(): void {
  console.log(`Usage:
  ./src/index.ts upload <target> <file...> [options]
  ./src/index.ts login
  ./src/index.ts list

Commands:
  upload                upload files to a Telegram group/channel/chat
  login (auth)          interactive login, prints TG_SESSION to save in .env
  list                  list your chats with their upload-ready ids

  Run with --help after a command for details:
    ./src/index.ts upload --help
    ./src/index.ts login --help
    ./src/index.ts list --help

Env:
  TG_API_ID, TG_API_HASH, TG_SESSION (or TG_STRING_SESSION), TG_BOT_TOKEN, TG_TARGET`);
}

const [cmd, ...rest] = process.argv.slice(2);

if (!cmd || cmd === "-h" || cmd === "--help") {
  printUsage();
  process.exit(0);
}

if (cmd === "upload") {
  await runUpload(rest);
} else if (cmd === "list") {
  await runList(rest);
} else if (cmd === "login" || cmd === "auth") {
  await runLogin(rest);
} else {
  console.error(`Unknown command: ${cmd}\n`);
  printUsage();
  process.exit(1);
}
