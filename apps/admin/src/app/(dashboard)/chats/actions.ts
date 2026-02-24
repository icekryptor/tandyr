'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createChatRoom(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const type = formData.get('type') as string;
  const memberIds = formData.getAll('member_ids') as string[];

  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .insert({ name, type })
    .select()
    .single();

  if (roomError) return { error: roomError.message };

  // Add members
  if (memberIds.length > 0) {
    const { error: memberError } = await supabase.from('chat_members').insert(
      memberIds.map((userId) => ({ room_id: room.id, user_id: userId })),
    );
    if (memberError) return { error: memberError.message };
  }

  revalidatePath('/chats');
  return { success: true };
}
