'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateTechRequestStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('tech_requests').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/tech-requests');
  return { success: true };
}

export async function takeIntoWork(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('tech_requests')
    .update({ status: 'in_progress', taken_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/tech-requests');
  return { success: true };
}

export async function setDeadline(id: string, deadline: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('tech_requests')
    .update({ deadline })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/tech-requests');
  return { success: true };
}

export async function resolveRequest(
  id: string,
  data: {
    resolution_description: string;
    resolution_photo_url?: string;
    resolution_cost?: number | null;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('tech_requests')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution_description: data.resolution_description,
      resolution_photo_url: data.resolution_photo_url || null,
      resolution_cost: data.resolution_cost ?? null,
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/tech-requests');
  return { success: true };
}
