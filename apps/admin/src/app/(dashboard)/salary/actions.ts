'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function calculateSalary(formData: FormData) {
  const supabase = await createClient();

  const user_id = formData.get('user_id') as string;
  const period_start = formData.get('period_start') as string;
  const period_end = formData.get('period_end') as string;
  const rate_per_kg = parseFloat(formData.get('rate_per_kg') as string);

  if (!user_id || !period_start || !period_end || !rate_per_kg) {
    return { error: 'Заполните все поля' };
  }

  // Sum production_kg for the period
  const { data: shifts } = await supabase
    .from('shifts')
    .select('production_kg')
    .eq('user_id', user_id)
    .eq('status', 'closed')
    .not('production_kg', 'is', null)
    .gte('end_time', `${period_start}T00:00:00`)
    .lte('end_time', `${period_end}T23:59:59`);

  const total_kg = (shifts ?? []).reduce((sum, s) => sum + (s.production_kg ?? 0), 0);
  const total_amount = total_kg * rate_per_kg;

  const { error } = await supabase.from('salary_records').insert({
    user_id,
    period_start,
    period_end,
    total_kg,
    rate_per_kg,
    total_amount,
    status: 'calculated',
  });

  if (error) return { error: error.message };

  revalidatePath('/salary');
  return { success: true, total_kg, total_amount };
}

export async function markSalaryPaid(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('salary_records')
    .update({ status: 'paid' })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/salary');
  return { success: true };
}
