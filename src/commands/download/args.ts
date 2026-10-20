/**
 * Argument parsing and usage for the download command.
 */
import { tokenize, unknownOption, hasHelp } from "../../helpers/cli.js";
import { getEnvTarget } from "../../helpers/env.js";
import { printDownloadUsage } from "./usage.js";

export type DownloadArgs = {
  target: string;
  messageId: number;
  output?: string;
  help: boolean;
};

export function parseArgs(argv: string[]): DownloadArgs {
  const t = tokenize(argv);
  if (hasHelp(t)) {
    return { target: "", messageId: 0, help: true };
  }
  const unknown = unknownOption(t, ["help", "h"]);
  if (unknown) {
    console.error(`Unknown option: ${unknown}\n`);
    printDownloadUsage();
    process.exit(1);
  }

  const { positionals } = t;
  let target: string | undefined;
  let idStr: string | undefined;
  let output: string | undefined;
  const envTarget = getEnvTarget();
  if (positionals.length === 3) {
    [target, idStr, output] = positionals;
  } else if (positionals.length === 2) {
    // With a default target configured, `download 123 ./out` means
    // <message-id> <output-path>. An explicit target still wins when the
    // first arg is not a bare message id: `download @group 123`.
    if (envTarget && /^\d+$/.test(positionals[0])) {
      target = envTarget;
      [idStr, output] = positionals;
    } else {
      [target, idStr] = positionals;
    }
  } else if (positionals.length === 1 && envTarget) {
    [idStr] = positionals;
    target = envTarget;
  } else {
    console.error("Missing arguments.\n");
    printDownloadUsage();
    process.exit(1);
  }

  const messageId = Number(idStr);
  if (!Number.isInteger(messageId) || messageId < 1) {
    console.error(`Invalid message id: ${idStr}`);
    process.exit(1);
  }
  return { target: target!, messageId, output, help: false };
}
