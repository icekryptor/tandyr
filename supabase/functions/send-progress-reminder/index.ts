// Supabase Edge Function: send-progress-reminder
// Schedule: runs 2x per day (e.g. 10:00 and 15:00 UTC)
// Set up via Supabase Dashboard > Edge Functions > Schedules
// Cron: "0 5,10 * * *" (UTC, adjust for your timezone)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildMessages, sendPushBatch } from '../_shared/push.ts';

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

  const messages = buildMessages(
    openShifts.map((s: any) => ({ push_token: s.users.push_token })),
    'Промежуточный прогресс 📊',
    'Укажите сколько кг продукции готово на данный момент',
    { screen: 'progress' },
  );

  const { sent, failed } = await sendPushBatch(messages);

  return new Response(
    JSON.stringify({ message: `Sent: ${sent}, failed: ${failed}`, total: messages.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
