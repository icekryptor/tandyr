'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function createChatRoom(formData: FormData) {
  const admin = createAdminClient();
  const name = formData.get('name') as string;
  const type = (formData.get('type') as string) || 'group';
  const room_type = (formData.get('room_type') as string) || 'general';
  const memberIds = formData.getAll('member_ids') as string[];

  const { data: room, error: roomError } = await admin
    .from('chat_rooms')
    .insert({ name, type, room_type })
    .select()
    .single();

  if (roomError) return { error: roomError.message };

  if (memberIds.length > 0) {
    const { error } = await admin.from('chat_members').insert(
      memberIds.map((user_id) => ({ room_id: room.id, user_id })),
    );
    if (error) return { error: error.message };
  }

  revalidatePath('/chats');
  return { success: true, id: room.id };
}

export async function sendMessage(roomId: string, formData: FormData) {
  const admin = createAdminClient();
  const content = (formData.get('content') as string) || '';
  const sender_id = formData.get('sender_id') as string;
  const media_url = (formData.get('media_url') as string) || null;
  const media_type = (formData.get('media_type') as string) || null;

  if (!content.trim() && !media_url) return { error: 'Пустое сообщение' };

  const { data, error } = await admin.from('messages').insert({
    room_id: roomId,
    user_id: sender_id,
    content: content.trim(),
    media_url,
    media_type: media_type || null,
  }).select('*, user:users(id, full_name, avatar_url)').single();

  if (error) return { error: error.message };
  return { success: true, message: data };
}

export async function editMessage(messageId: string, content: string) {
  const admin = createAdminClient();
  const { error } = await admin.from('messages').update({
    content,
    edited_at: new Date().toISOString(),
  }).eq('id', messageId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteMessage(messageId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from('messages').update({
    is_deleted: true,
    content: '',
  }).eq('id', messageId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function uploadChatMedia(roomId: string, formData: FormData) {
  const admin = createAdminClient();
  const file = formData.get('file') as File;
  const sender_id = formData.get('sender_id') as string;

  if (!file) return { error: 'Файл не передан' };

  const isVideo = file.type.startsWith('video/');
  const ext = file.name.split('.').pop() ?? (isVideo ? 'mp4' : 'jpg');
  const path = `${sender_id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from('chat-media')
    .upload(path, file, { upsert: false });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = admin.storage.from('chat-media').getPublicUrl(path);

  const { data, error } = await admin.from('messages').insert({
    room_id: roomId,
    user_id: sender_id,
    content: '',
    media_url: urlData.publicUrl,
    media_type: isVideo ? 'video' : 'image',
  }).select('*, user:users(id, full_name, avatar_url)').single();

  if (error) return { error: error.message };
  return { success: true, message: data };
}
