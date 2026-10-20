/**
 * Usage text for the download command.
 */
export function printDownloadUsage(): void {
  console.log(`Usage:
  ./src/index.ts download [target] <message-id> [output-path]

Downloads the document attached to a message. The target defaults to
TG_TARGET / TG_GROUP_ID from .env. Use the files command to find ids.
If output-path is a directory, the original filename is kept inside it.
Without output-path, the file is saved under its original name.

Examples:
  ./src/index.ts download 12345
  ./src/index.ts download -4674583959 12345 ./restored.tar.gz
  ./src/index.ts download -4674583959 12345 ~/Downloads/`);
}
