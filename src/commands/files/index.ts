/**
 * Files entrypoint: parse args, show usage, run the command.
 */
import { parseArgs } from "./args.js";
import { executeFiles } from "./command.js";
import { printFilesUsage } from "./usage.js";

export async function runFiles(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    printFilesUsage();
    return;
  }
  try {
    await executeFiles(args);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
