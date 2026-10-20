import { Logger, TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";

export function createClient(
  sessionStr: string,
  apiId: number,
  apiHash: string,
): TelegramClient {
  // Pre-leveled logger: silences teleproto's INFO chatter (including the
  // constructor banner) so our own progress lines stay clean. Errors surface.
  return new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
    connectionRetries: 5,
    baseLogger: new Logger("error" as never),
  });
}

/** Non-interactive connect for uploads. Throws on revoked/expired session. */
export async function connectForUpload(
  client: TelegramClient,
  opts: { sessionStr: string; botToken: string },
): Promise<void> {
  if (opts.botToken) {
    await client.start({ botAuthToken: opts.botToken });
    return;
  }
  await client.connect();
  await client.getMe(); // fail fast on revoked/expired session
}
