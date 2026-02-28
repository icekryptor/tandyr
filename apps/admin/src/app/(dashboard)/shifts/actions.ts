'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { safeFloatOrNull } from '@tandyr/shared';

export async function setShiftFine(id: string, formData: FormData) {
  const admin = createAdminClient();
  const fine = safeFloatOrNull(formData.get('fine'));
  const fine_reason = (formData.get('fine_reason') as string) || null;
  const fine_comment = (formData.get('fine_comment') as string) || null;

  const { error } = await admin
    .from('shifts')
    .update({ fine, fine_reason, fine_comment })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/shifts');
  revalidatePath(`/shifts/${id}`);
  return { success: true };
}

export async function setShiftAccrual(id: string, formData: FormData) {
  const admin = createAdminClient();
  const accrual = safeFloatOrNull(formData.get('accrual'));

  if (accrual !== null && accrual < 0) return { error: 'Начисление не может быть отрицательным' };

  const { error } = await admin
    .from('shifts')
    .update({ accrual })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/shifts');
  revalidatePath(`/shifts/${id}`);
  return { success: true };
}
