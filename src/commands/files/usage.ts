/**
 * Usage text for the files command.
 */
export function printFilesUsage(): void {
  console.log(`Usage:
  ./src/index.ts files [target] [--limit <n>]

Lists documents in a chat as: <message-id> <size> <date> <filename>
The target defaults to TG_TARGET from .env.

Examples:
  ./src/index.ts files
  ./src/index.ts files -4674583959 --limit 20`);
}
