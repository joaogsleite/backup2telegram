/**
 * Argument parsing for the login command.
 */
import { hasHelp, tokenize } from "../../helpers/cli.js";

export function parseArgs(argv: string[]): { help: boolean } {
  return { help: hasHelp(tokenize(argv)) };
}
