'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

  // Wait for the DB trigger to insert the user profile row
  await new Promise((r) => setTimeout(r, 500));

  const { error: profileError } = await admin
    .from('users')
    .update({
      full_name,
      phone: nullifyEmpty(phone),
      store_id: nullifyEmpty(store_id),
      company_role: nullifyEmpty(company_role),
    })
    .eq('id', authData.user.id);

  if (profileError) return { error: profileError.message };

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
