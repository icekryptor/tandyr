'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateUserProfileWithTriggerRetry } from '@/lib/supabase/profile-update';
import { revalidatePath } from 'next/cache';
import { nullifyEmpty, safeFloat } from '@tandyr/shared';

export async function createEmployee(formData: FormData) {
  const admin = createAdminClient();

  const full_name = formData.get('full_name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const phone = formData.get('phone') as string;
  const store_id = formData.get('store_id') as string;
  const company_role = formData.get('company_role') as string;

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'employee' },
  });

  if (authError) return { error: authError.message };

  // The on_auth_user_created trigger inserts the public.users row
  // asynchronously, so retry with backoff until the row exists (otherwise
  // UPDATE matches 0 rows and silently succeeds, leaving an orphan profile).
  const profile = await updateUserProfileWithTriggerRetry(admin, authData.user.id, {
    full_name,
    phone: nullifyEmpty(phone),
    store_id: nullifyEmpty(store_id),
    company_role: nullifyEmpty(company_role),
  });

  if (!profile.ok) return { error: profile.error };

  revalidatePath('/employees');
  return { success: true };
}

export async function updateEmployee(id: string, formData: FormData) {
  const supabase = await createClient();

  const str = (key: string) => nullifyEmpty(formData.get(key) as string);

  const { error } = await supabase.from('users').update({
    // Basic
    full_name: formData.get('full_name'),
    phone: str('phone'),
    city: str('city'),
    birth_date: str('birth_date'),
    company_role: str('company_role'),
    store_id: str('store_id'),

    // Payment
    bank_name: str('bank_name'),
    card_number: str('card_number'),
    card_pin: str('card_pin'),
    debt: safeFloat(formData.get('debt')),

    // Documents
    patent_expires_at: str('patent_expires_at'),
    patent_region: str('patent_region'),
    nationality: str('nationality'),
    passport_number: str('passport_number'),
    med_book_expires_at: str('med_book_expires_at'),
  }).eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/employees');
  revalidatePath(`/employees/${id}`);
  return { success: true };
}

export async function updateEmployeePassword(id: string, formData: FormData) {
  const admin = createAdminClient();
  const password = formData.get('password') as string;

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return { error: error.message };

  revalidatePath(`/employees/${id}`);
  return { success: true };
}

export async function deleteEmployee(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };

  revalidatePath('/employees');
  return { success: true };
}

export async function toggleEmployeeStatus(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from('users').update({ is_active: !isActive }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/employees');
  revalidatePath(`/employees/${id}`);
  return { success: true };
}

export async function updateEmployeeCities(userId: string, cityIds: string[]) {
  const admin = createAdminClient();

  // Delete existing, then re-insert
  await admin.from('user_cities').delete().eq('user_id', userId);

  if (cityIds.length > 0) {
    const { error } = await admin.from('user_cities').insert(
      cityIds.map((city_id) => ({ user_id: userId, city_id })),
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/employees/${userId}`);
  return { success: true };
}

export async function createInvite(input: {
  email?: string;
  store_id?: string;
  company_role?: string;
}): Promise<{ token: string } | { error: string }> {
  // Use service role; the gate is implicit because this action is callable
  // only from /employees pages which are inside (dashboard) and auth-gated.
  // Re-check the user is a system admin or business admin for defence-in-depth.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизованы' };

  const admin = createAdminClient();

  const { data: me } = await admin
    .from('users')
    .select('role, company_role')
    .eq('id', user.id)
    .single();
  const isSystemAdmin = me?.role === 'admin';
  const isBusinessAdmin = ['owner', 'admin'].includes(me?.company_role ?? '');
  if (!me || (!isSystemAdmin && !isBusinessAdmin)) {
    return { error: 'Недостаточно прав' };
  }

  const payload: Record<string, unknown> = { created_by: user.id };
  if (input.email?.trim()) payload.email = input.email.trim();
  if (input.store_id) payload.store_id = input.store_id;
  if (input.company_role) payload.company_role = input.company_role;

  const { data, error } = await admin
    .from('invites')
    .insert(payload)
    .select('token')
    .single();

  if (error || !data) return { error: error?.message ?? 'Не удалось создать инвайт.' };
  return { token: data.token };
}

export async function uploadEmployeeFile(id: string, formData: FormData) {
  const admin = createAdminClient();
  const file = formData.get('file') as File;
  const field = formData.get('field') as 'contract' | 'passport';

  if (!file || !field) return { error: 'Файл не передан' };

  const ext = file.name.split('.').pop() ?? 'pdf';
  const path = `${id}/${field}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from('employee-docs')
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = admin.storage.from('employee-docs').getPublicUrl(path);

  const column = field === 'contract' ? 'contract_url' : 'passport_url';
  const { error: updateError } = await admin
    .from('users')
    .update({ [column]: urlData.publicUrl })
    .eq('id', id);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/employees/${id}`);
  return { success: true };
}
