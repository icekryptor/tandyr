// Shared Expo Push Notification utility for Edge Functions

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  priority?: string;
}

/**
 * Send push notifications via Expo Push API in batches of 100.
 * Returns count of successfully sent vs failed messages.
 */
export async function sendPushBatch(
  messages: PushMessage[],
): Promise<{ sent: number; failed: number }> {
  if (messages.length === 0) return { sent: 0, failed: 0 };

  const batches: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    batches.push(messages.slice(i, i + 100));
  }

  const results = await Promise.allSettled(
    batches.map((batch) =>
      fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      }),
    ),
  );

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const batchSize = batches[i].length;
    if (r.status === 'fulfilled') {
      sent += batchSize;
    } else {
      failed += batchSize;
    }
  }
  return { sent, failed };
}

/**
 * Build PushMessage objects from users with push_token.
 */
export function buildMessages(
  users: Array<{ push_token: string }>,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): PushMessage[] {
  return users.map((u) => ({
    to: u.push_token,
    title,
    body,
    data: data ?? {},
    sound: 'default' as const,
    priority: 'high' as const,
  }));
}
