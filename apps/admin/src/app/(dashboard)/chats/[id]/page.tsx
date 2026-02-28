export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { ChatRoomClient } from './chat-room-client';

export default async function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: room }, { data: messages }, { data: members }] = await Promise.all([
    admin
      .from('chat_rooms')
      .select('*')
      .eq('id', id)
      .single(),
    admin
      .from('messages')
      .select('*, user:users(id, full_name, avatar_url)')
      .eq('room_id', id)
      .order('created_at', { ascending: true })
      .limit(200),
    admin
      .from('chat_members')
      .select('user_id, user:users(id, full_name, email)')
      .eq('room_id', id),
  ]);

  if (!room) notFound();

  // Admin sender — use first admin user
  const { data: adminUser } = await admin
    .from('users')
    .select('id, full_name')
    .eq('role', 'admin')
    .order('created_at')
    .limit(1)
    .single();

  return (
    <ChatRoomClient
      room={room}
      initialMessages={messages ?? []}
      members={members ?? []}
      adminUser={adminUser}
    />
  );
}
