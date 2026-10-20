/**
 * Usage text for the login command.
 */
export function printLoginUsage(): void {
  console.log(`Usage:
  ./src/index.ts login

Env:
  TG_API_ID, TG_API_HASH (required)

Prints a session string. Save it as TG_SESSION in .env.`);
}
