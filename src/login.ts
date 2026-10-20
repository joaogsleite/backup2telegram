/**
 * Interactive login to generate TG_SESSION for the upload command.
 * Called by ./index.ts - not directly executable.
 */
import { createInterface } from "node:readline/promises";
import { StringSession } from "teleproto/sessions";
import { requireApiCredentials } from "./env.js";
import { createClient } from "./telegram.js";

export function printLoginUsage(): void {
  console.log(`Usage:
  ./src/index.ts login

Env:
  TG_API_ID, TG_API_HASH (required)

Prints a session string. Save it as TG_SESSION in .env.`);
}

export async function runLogin(argv: string[]): Promise<void> {
  if (argv.includes("-h") || argv.includes("--help")) {
    printLoginUsage();
    return;
  }

  const { apiId, apiHash } = requireApiCredentials();
  const client = createClient("", apiId, apiHash);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await client.start({
      phoneNumber: () => rl.question("Phone (+country code): "),
      phoneCode: () => rl.question("Login code: "),
      password: (hint?: string) =>
        rl.question(`2FA password${hint ? ` (hint: ${hint})` : ""}: `),
      onError: (err: Error) => console.error(err),
    });
    console.log("\nSave this session string as TG_SESSION in .env:\n");
    console.log((client.session as StringSession).save());
  } finally {
    rl.close();
    try {
      await client.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}
