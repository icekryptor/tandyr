'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { safeFloatOrNull } from '@tandyr/shared';

// Fallback defaults — used only if settings table is unreachable
const DEFAULT_RATE_PER_KG = 30;
const DEFAULT_RATE_PER_SHIFT = 1500;

/** Fetch salary rates from settings table, falling back to defaults */
async function getRates(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from('settings')
    .select('key, value')
    .in('key', ['shift_base_rate', 'shift_kg_rate']);

  const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));

  const baseRate = parseFloat(map.get('shift_base_rate') ?? '') || DEFAULT_RATE_PER_SHIFT;
  // shift_kg_rate in settings = per 10kg (e.g. 300), so per-kg = 300/10 = 30
  const kgRatePer10 = parseFloat(map.get('shift_kg_rate') ?? '') || (DEFAULT_RATE_PER_KG * 10);
  const kgRate = kgRatePer10 / 10;

  return { baseRate, kgRate };
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Calculate (or recalculate) weekly salary for a user+week */
export async function calculateWeeklySalary(formData: FormData) {
  const admin = createAdminClient();
  const user_id = formData.get('user_id') as string;
  const week_number = parseInt(formData.get('week_number') as string);
  const week_year = parseInt(formData.get('week_year') as string);

  if (!user_id || isNaN(week_number) || isNaN(week_year)) {
    return { error: 'Заполните все поля' };
  }

  // Derive period_start / period_end from week_number + week_year
  // Find the Monday of ISO week `week_number` in `week_year`
  const jan4 = new Date(Date.UTC(week_year, 0, 4)); // Jan 4 is always in week 1
  const jan4Day = jan4.getUTCDay() || 7;
  const weekStart = new Date(jan4);
  weekStart.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week_number - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  const period_start = toDateStr(weekStart);
  const period_end = toDateStr(weekEnd);

  // Fetch rates from settings
  const { baseRate, kgRate } = await getRates(admin);

  // Fetch closed shifts in that week
  const { data: shifts, error: shiftsErr } = await admin
    .from('shifts')
    .select('production_kg, fine')
    .eq('user_id', user_id)
    .eq('status', 'closed')
    .gte('start_time', `${period_start}T00:00:00`)
    .lte('start_time', `${period_end}T23:59:59`);

  if (shiftsErr) return { error: shiftsErr.message };

  const shift_count = (shifts ?? []).length;
  const total_kg = (shifts ?? []).reduce((s, r) => s + (r.production_kg ?? 0), 0);
  const fines_total = (shifts ?? []).reduce((s, r) => s + (r.fine ?? 0), 0);
  const accrual_kg = total_kg * kgRate;
  const accrual_shift = shift_count * baseRate;
  const total_accrual = accrual_kg + accrual_shift;

  // Fetch user's current debt
  const { data: userRow } = await admin.from('users').select('debt').eq('id', user_id).single();
  const current_debt = userRow?.debt ?? 0;

  const { error } = await admin.from('weekly_salaries').upsert({
    user_id,
    week_number,
    week_year,
    period_start,
    period_end,
    shift_count,
    total_kg,
    accrual_kg,
    accrual_shift,
    total_accrual,
    fines_total,
    current_debt,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,week_year,week_number' });

  if (error) return { error: error.message };

  revalidatePath('/salary');
  return { success: true, shift_count, total_kg, total_accrual };
}

/** Update manual payment fields */
export async function updateSalaryPayment(id: string, formData: FormData) {
  const admin = createAdminClient();
  const transferred = formData.get('transferred');
  const debt_written_off = formData.get('debt_written_off');
  const status = formData.get('status') as string;

  const { error } = await admin.from('weekly_salaries').update({
    transferred: safeFloatOrNull(transferred),
    debt_written_off: safeFloatOrNull(debt_written_off),
    status: status || 'pending',
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/salary');
  return { success: true };
}

/** Old actions kept for backwards compat */
export async function calculateSalary() {
  return { error: 'Используйте calculateWeeklySalary' };
}

export async function markSalaryPaid(id: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('weekly_salaries')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/salary');
  return { success: true };
}
