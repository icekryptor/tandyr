'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function createEmployee(formData: FormData) {
  const admin = getAdminClient();

  const full_name = formData.get('full_name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const phone = formData.get('phone') as string;
  const store_id = formData.get('store_id') as string;

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'employee' },
  });

  if (authError) return { error: authError.message };

  // Update profile
  const { error: profileError } = await admin
    .from('users')
    .update({ full_name, phone: phone || null, store_id: store_id || null })
    .eq('id', authData.user.id);

  if (profileError) return { error: profileError.message };

  revalidatePath('/employees');
  return { success: true };
}

export async function updateEmployee(id: string, formData: FormData) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    full_name: formData.get('full_name'),
    phone: formData.get('phone') || null,
    store_id: formData.get('store_id') || null,
  };

  const { error } = await supabase.from('users').update(updates).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/employees');
  return { success: true };
}

export async function toggleEmployeeStatus(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from('users').update({ is_active: !isActive }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/employees');
  return { success: true };
}
