'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';

type Result = { ok: true } | { ok: false; error: string };

export async function signUpAdmin(formData: FormData): Promise<Result> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();

  if (!email || !password || !fullName) {
    return { ok: false, error: 'Заполните все поля.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Пароль должен быть не короче 6 символов.' };
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Re-check the toggle on the server so the gate cannot be bypassed.
  const { data: settingRow } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'open_signup_enabled')
    .single();
  if (settingRow?.value !== 'true') {
    return { ok: false, error: 'Регистрация сейчас закрыта.' };
  }

  // Create the auth user with email already confirmed.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? 'Не удалось создать аккаунт.' };
  }

  // Insert public.users row with role=admin
  const { error: insErr } = await admin.from('users').insert({
    id: created.user.id,
    email,
    full_name: fullName,
    role: 'admin',
    is_active: true,
  });
  if (insErr) {
    // Roll back the auth user to avoid orphan
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Ошибка профиля: ${insErr.message}` };
  }

  return { ok: true };
}
