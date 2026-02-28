'use server';

import { createClient } from '@/lib/supabase/server';

export async function startShift(storeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const existing = await supabase
    .from('shifts')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .maybeSingle();

  if (existing.data) return { error: 'У вас уже есть открытая смена' };

  const { error } = await supabase.from('shifts').insert({
    user_id: user.id,
    store_id: storeId,
    started_at: new Date().toISOString(),
    status: 'open',
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function endShift(shiftId: string, productionKg: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('shifts')
    .update({
      ended_at: new Date().toISOString(),
      production_kg: productionKg,
      status: 'closed',
    })
    .eq('id', shiftId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function submitProgress(shiftId: string, kg: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { error } = await supabase.from('progress_reports').insert({
    shift_id: shiftId,
    user_id: user.id,
    production_kg: kg,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function submitTechRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const storeId = formData.get('store_id') as string;

  const { error } = await supabase.from('tech_requests').insert({
    user_id: user.id,
    store_id: storeId || null,
    title,
    description,
    status: 'pending',
  });

  if (error) return { error: error.message };
  return { success: true };
}
