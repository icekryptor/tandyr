'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActionResult = { success: true; error?: never } | { success?: never; error: string };

/**
 * Open a shift. Photo is uploaded client-side (browser -> Storage direct);
 * the action receives the resulting public URL. Runs under the user's
 * session, so the shifts INSERT RLS policy (user_id = auth.uid()) applies.
 */
export async function startShift({
  storeId,
  photoUrl,
  lat,
  lng,
}: {
  storeId: string;
  photoUrl: string;
  lat: number;
  lng: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { data: existing } = await supabase
    .from('shifts')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .maybeSingle();
  if (existing) return { error: 'У вас уже есть открытая смена' };

  const { error } = await supabase.from('shifts').insert({
    user_id: user.id,
    store_id: storeId,
    start_photo_url: photoUrl,
    start_lat: lat,
    start_lng: lng,
    start_time: new Date().toISOString(),
    status: 'open',
  });
  if (error) return { error: error.message };

  revalidatePath('/employee');
  return { success: true };
}

export async function endShift({
  shiftId,
  photoUrl,
  lat,
  lng,
  productionKg,
}: {
  shiftId: string;
  photoUrl: string;
  lat: number;
  lng: number;
  productionKg: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  if (!Number.isFinite(productionKg) || productionKg <= 0) {
    return { error: 'Укажите выработку больше нуля' };
  }

  const { data, error } = await supabase
    .from('shifts')
    .update({
      end_photo_url: photoUrl,
      end_lat: lat,
      end_lng: lng,
      end_time: new Date().toISOString(),
      production_kg: productionKg,
      status: 'closed',
    })
    .eq('id', shiftId)
    .eq('user_id', user.id)
    .eq('status', 'open')
    .select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: 'Смена не найдена или уже закрыта' };

  revalidatePath('/employee');
  return { success: true };
}

/** Intermediate production report. progress_reports has NO user_id column. */
export async function submitProgress(shiftId: string, kg: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  if (!Number.isFinite(kg) || kg <= 0) {
    return { error: 'Укажите количество больше нуля' };
  }

  const { data: shift } = await supabase
    .from('shifts')
    .select('id')
    .eq('id', shiftId)
    .eq('user_id', user.id)
    .eq('status', 'open')
    .maybeSingle();
  if (!shift) return { error: 'Смена не найдена или уже закрыта' };

  const { error } = await supabase.from('progress_reports').insert({
    shift_id: shiftId,
    production_kg: kg,
    reported_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  return { success: true };
}

/** tech_requests has NO title column; shift_id is the current open shift if any. */
export async function submitTechRequest({
  description,
  photoUrl,
}: {
  description: string;
  photoUrl?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const trimmed = description.trim();
  if (!trimmed) return { error: 'Опишите проблему' };

  const { data: openShift } = await supabase
    .from('shifts')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .maybeSingle();

  const { error } = await supabase.from('tech_requests').insert({
    user_id: user.id,
    shift_id: openShift?.id ?? null,
    photo_url: photoUrl ?? null,
    description: trimmed,
    status: 'pending',
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateProfile({ phone }: { phone: string | null }): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const trimmed = phone?.trim() ?? '';
  const { error } = await supabase
    .from('users')
    .update({ phone: trimmed.length === 0 ? null : trimmed })
    .eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/employee/profile');
  revalidatePath('/employee');
  return { success: true };
}
