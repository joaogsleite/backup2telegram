/**
 * Usage text for the chats command.
 */
export function printChatsUsage(): void {
  console.log(`Usage:
  ./src/index.ts chats [--limit <n>]

Prints your chats as: <marked-id> (<type>) <title>
Use the marked id as the upload target, e.g.:
  ./src/index.ts upload -1001234567890 ./backup.tar.gz`);
}
