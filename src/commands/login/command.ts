/**
 * The login command: interactive login, prints TG_SESSION to save in .env.
 */
import { createInterface } from "node:readline/promises";
import { StringSession } from "teleproto/sessions";
import { requireApiCredentials } from "../../helpers/env.js";
import { createClient } from "../../helpers/telegram.js";

export async function executeLogin(): Promise<void> {
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
