/**
 * Download entrypoint: parse args, show usage, run the command.
 */
import { parseArgs } from "./args.js";
import { executeDownload } from "./command.js";
import { printDownloadUsage } from "./usage.js";

export async function runDownload(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    printDownloadUsage();
    return;
  }
  try {
    await executeDownload(args);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
