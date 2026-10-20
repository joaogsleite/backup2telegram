/**
 * Argument parsing and usage for the files command.
 */
import {
  hasHelp,
  optInt,
  tokenize,
  unknownOption,
} from "../../helpers/cli.js";
import { getEnvTarget } from "../../helpers/env.js";
import { printFilesUsage } from "./usage.js";

export type FilesArgs = {
  target: string;
  limit: number;
  help: boolean;
};

export function parseArgs(argv: string[]): FilesArgs {
  const t = tokenize(argv);
  if (hasHelp(t)) {
    return { target: "", limit: 50, help: true };
  }
  const unknown = unknownOption(t, ["limit", "help", "h"]);
  if (unknown) {
    console.error(`Unknown option: ${unknown}\n`);
    printFilesUsage();
    process.exit(1);
  }

  const limit = optInt(t, "limit") ?? 50;
  if (!Number.isInteger(limit) || limit < 1) {
    console.error("--limit must be a positive integer");
    process.exit(1);
  }

  const { positionals } = t;
  const target = positionals[0] ?? getEnvTarget();
  if (positionals.length > 1) {
    console.error(`Unexpected argument: ${positionals[1]}\n`);
    printFilesUsage();
    process.exit(1);
  }
  if (!target) {
    console.error("Missing target. Pass one or set TG_TARGET in .env.\n");
    printFilesUsage();
    process.exit(1);
  }
  return { target, limit, help: false };
}
