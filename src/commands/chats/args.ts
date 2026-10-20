/**
 * Argument parsing and usage for the chats command.
 */
import {
  hasHelp,
  optInt,
  tokenize,
  unknownOption,
} from "../../helpers/cli.js";
import { printChatsUsage } from "./usage.js";

export type ChatsArgs = {
  limit: number;
  help: boolean;
};

export function parseArgs(argv: string[]): ChatsArgs {
  const t = tokenize(argv);
  if (hasHelp(t)) {
    return { limit: 100, help: true };
  }
  const unknown = unknownOption(t, ["limit", "help", "h"]);
  if (unknown) {
    console.error(`Unknown option: ${unknown}\n`);
    printChatsUsage();
    process.exit(1);
  }
  if (t.positionals.length > 0) {
    console.error(`Unexpected argument: ${t.positionals[0]}\n`);
    printChatsUsage();
    process.exit(1);
  }
  const limit = optInt(t, "limit") ?? 100;
  if (!Number.isInteger(limit) || limit < 1) {
    console.error("--limit must be a positive integer");
    process.exit(1);
  }
  return { limit, help: false };
}
