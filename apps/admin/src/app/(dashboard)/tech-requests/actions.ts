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
