export const dynamic = 'force-dynamic';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { ChatsAdminClient } from './chats-admin-client';

export default async function AdminChatsPage() {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: rooms }, { data: employees }] = await Promise.all([
    admin
      .from('chat_rooms')
      .select(`
        *,
        members:chat_members(user_id, user:users(id, full_name)),
        last_message:messages(content, media_type, created_at, user:users(full_name))
      `)
      .order('created_at', { ascending: false }),
    admin
      .from('users')
      .select('id, full_name, email')
      .eq('is_active', true)
      .order('full_name'),
  ]);

  // Sort last_message by created_at desc per room (Supabase returns array)
  type LastMessage = { content: string; media_type: string | null; created_at: string; user: { full_name: string } | null };
  type RawRoom = Record<string, unknown> & { last_message?: LastMessage[] | null };
  const roomsWithLastMsg = ((rooms ?? []) as RawRoom[]).map((r) => ({
    ...r,
    last_message: r.last_message?.length
      ? [...r.last_message].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
      : null,
  })) as Parameters<typeof ChatsAdminClient>[0]['rooms'];

  return <ChatsAdminClient rooms={roomsWithLastMsg} employees={employees ?? []} />;
}
