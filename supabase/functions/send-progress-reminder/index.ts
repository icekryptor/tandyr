// Supabase Edge Function: send-progress-reminder
// Schedule: runs 2x per day (e.g. 10:00 and 15:00 UTC)
// Set up via Supabase Dashboard > Edge Functions > Schedules
// Cron: "0 5,10 * * *" (UTC, adjust for your timezone)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  priority?: string;
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Get all users with open shifts who have push tokens
  const { data: openShifts, error } = await supabase
    .from('shifts')
    .select('user_id, users!inner(id, full_name, push_token)')
    .eq('status', 'open')
    .not('users.push_token', 'is', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!openShifts?.length) {
    return new Response(JSON.stringify({ message: 'No open shifts' }), { status: 200 });
  }

  // Build push messages
  const messages: PushMessage[] = openShifts.map((shift: any) => ({
    to: shift.users.push_token,
    title: 'Промежуточный прогресс 📊',
    body: 'Укажите сколько кг продукции готово на данный момент',
    data: { screen: 'progress' },
    sound: 'default',
    priority: 'high',
  }));

  // Send via Expo Push API (batches of 100)
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

  const sent = results.filter((r) => r.status === 'fulfilled').length * 100;

  return new Response(
    JSON.stringify({ message: `Sent notifications to ~${Math.min(sent, messages.length)} users` }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
