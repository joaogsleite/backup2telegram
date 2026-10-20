/**
 * Upload entrypoint: parse args, show usage, validate, run the command.
 */
import { assertValidArgs, parseArgs } from "./args.js";
import { executeUpload } from "./command.js";
import { printUploadUsage } from "./usage.js";

export async function runUpload(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    printUploadUsage();
    return;
  }
  const volumeBytes = assertValidArgs(args);
  try {
    await executeUpload(args, volumeBytes);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
