import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";

export function createClient(
  sessionStr: string,
  apiId: number,
  apiHash: string,
): TelegramClient {
  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
    connectionRetries: 5,
  });
  // Silence teleproto's INFO chatter so our own progress lines stay clean.
  // Errors still surface.
  client.setLogLevel(
    "error" as Parameters<TelegramClient["setLogLevel"]>[0],
  );
  return client;
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
