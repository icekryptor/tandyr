import { createClient } from '@/lib/supabase/server';
import { ChatsAdminClient } from './chats-admin-client';

export default async function AdminChatsPage() {
  const supabase = await createClient();

  const [{ data: rooms }, { data: employees }] = await Promise.all([
    supabase
      .from('chat_rooms')
      .select('*, chat_members(user_id, users(full_name))')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, full_name, email')
      .eq('is_active', true)
      .order('full_name'),
  ]);

  return <ChatsAdminClient rooms={rooms ?? []} employees={employees ?? []} />;
}
