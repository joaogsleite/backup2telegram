/**
 * Login entrypoint: parse args, show usage, run the command.
 */
import { parseArgs } from "./args.js";
import { executeLogin } from "./command.js";
import { printLoginUsage } from "./usage.js";

export async function runLogin(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    printLoginUsage();
    return;
  }
  try {
    await executeLogin();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
