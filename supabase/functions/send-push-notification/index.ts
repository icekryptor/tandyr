// Supabase Edge Function: send-push-notification
// Generic push notification sender via Expo Push API
//
// POST body:
//   { user_id: string, title: string, body: string, data?: object }
//   OR
//   { user_ids: string[], title: string, body: string, data?: object }
//
// Can also be triggered by DB webhook for:
//   - new chat message  → notify recipient
//   - tech request status change → notify requester
//   - inventory act created → notify assigned baker

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildMessages, sendPushBatch } from '../_shared/push.ts';

interface RequestBody {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { title, body: notifBody, data } = body;
  if (!title || !notifBody) {
    return new Response(JSON.stringify({ error: 'title and body are required' }), { status: 400 });
  }

  // Collect user IDs to notify
  const userIds: string[] = [];
  if (body.user_id) userIds.push(body.user_id);
  if (body.user_ids?.length) userIds.push(...body.user_ids);
  if (userIds.length === 0) {
    return new Response(JSON.stringify({ error: 'user_id or user_ids required' }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fetch push tokens for the given users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, push_token')
    .in('id', userIds)
    .not('push_token', 'is', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!users?.length) {
    return new Response(
      JSON.stringify({ message: 'No push tokens found for specified users' }),
      { status: 200 },
    );
  }

  const messages = buildMessages(users as any[], title, notifBody, data);
  const { sent, failed } = await sendPushBatch(messages);

  return new Response(
    JSON.stringify({ message: `Sent: ${sent}, failed: ${failed}`, total: messages.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
