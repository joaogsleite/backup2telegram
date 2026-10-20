#!/usr/bin/env -S npx --no-install tsx
/**
 * backup2telegram - move files to and from Telegram via teleproto (MTProto).
 *
 *   ./src/index.ts upload <target> <file...> [options]
 *   ./src/index.ts download [target] <message-id> [output-path]
 *   ./src/index.ts files [target] [--limit <n>]
 *   ./src/index.ts chats [--limit <n>]
 *   ./src/index.ts login
 *
 *   npm run upload -- <target> <file...> [options]
 *   npm run download -- [target] <message-id> [output-path]
 *   npm run files -- [target]
 *   npm run chats
 *   npm run login
 *
 * No global installs needed: `npm install` provides ./node_modules/.bin/tsx
 * and the shebang above resolves it via `npx --no-install tsx` locally.
 */
import { loadDotEnv } from "./env.js";
import { runChats } from "./chats.js";
import { runDownload } from "./download.js";
import { runFiles } from "./files.js";
import { runLogin } from "./login.js";
import { runUpload } from "./upload.js";

loadDotEnv();

function printUsage(): void {
  console.log(`Usage:
  ./src/index.ts upload <target> <file...> [options]
  ./src/index.ts download [target] <message-id> [output-path]
  ./src/index.ts files [target] [--limit <n>]
  ./src/index.ts chats [--limit <n>]
  ./src/index.ts login

Commands:
  upload                upload files to a Telegram group/channel/chat
  download              download a file from a chat by message id
  files                 list files in a chat (message ids for download)
  chats                 list your chats with their upload-ready ids
  login (auth)          interactive login, prints TG_SESSION to save in .env

  Run with --help after a command for details:
    ./src/index.ts upload --help
    ./src/index.ts download --help
    ./src/index.ts files --help
    ./src/index.ts chats --help
    ./src/index.ts login --help

Env:
  TG_API_ID, TG_API_HASH, TG_SESSION (or TG_STRING_SESSION), TG_BOT_TOKEN, TG_TARGET, TG_GROUP_ID`);
}

const [cmd, ...rest] = process.argv.slice(2);

if (!cmd || cmd === "-h" || cmd === "--help") {
  printUsage();
  process.exit(0);
}

if (cmd === "upload") {
  await runUpload(rest);
} else if (cmd === "download") {
  await runDownload(rest);
} else if (cmd === "files") {
  await runFiles(rest);
} else if (cmd === "chats" || cmd === "list") {
  await runChats(rest);
} else if (cmd === "login" || cmd === "auth") {
  await runLogin(rest);
} else {
  console.error(`Unknown command: ${cmd}\n`);
  printUsage();
  process.exit(1);
}
