export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { ChatRoomClient } from './chat-room-client';

/* Supabase without generated DB types infers nested selects as arrays.
   We declare the expected shapes and use .returns<>() to fix the mismatch. */
type MemberRow = {
  user_id: string;
  user: { id: string; full_name: string; email: string } | null;
};

type MessageRow = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  edited_at: string | null;
  is_deleted: boolean;
  created_at: string;
  user: { id: string; full_name: string; avatar_url: string | null } | null;
};

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
      .limit(200)
      .returns<MessageRow[]>(),
    admin
      .from('chat_members')
      .select('user_id, user:users(id, full_name, email)')
      .eq('room_id', id)
      .returns<MemberRow[]>(),
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
