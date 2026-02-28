'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function saveSettings(data: Record<string, string>) {
  const supabase = await createClient();

  const { data: me } = await supabase
    .from('users')
    .select('company_role')
    .single();

  if (!me || !['owner', 'admin'].includes(me.company_role ?? '')) {
    return { error: 'Недостаточно прав' };
  }

  const upserts = Object.entries(data).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('settings')
    .upsert(upserts, { onConflict: 'key' });

  if (error) return { error: error.message };

  revalidatePath('/settings');
  return { success: true };
}
