/**
 * Chats entrypoint: parse args, show usage, run the command.
 */
import { parseArgs } from "./args.js";
import { executeChats } from "./command.js";
import { printChatsUsage } from "./usage.js";

export async function runChats(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    printChatsUsage();
    return;
  }
  try {
    await executeChats(args);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
