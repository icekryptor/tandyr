'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';

import { updateUserProfileWithTriggerRetry } from '@/lib/supabase/profile-update';

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
    const raw = createErr?.message ?? '';
    if (/already/i.test(raw) || /exists/i.test(raw) || /registered/i.test(raw)) {
      return { ok: false, error: 'Аккаунт с таким email уже зарегистрирован. Попробуйте войти.' };
    }
    return { ok: false, error: raw || 'Не удалось создать аккаунт.' };
  }

  // Enrich the trigger-created row: set role=admin, full_name, email.
  // The on_auth_user_created trigger inserts the row asynchronously, so we
  // retry with backoff until the row exists (otherwise UPDATE matches 0 rows
  // and silently succeeds, leaving an orphan profile).
  const profile = await updateUserProfileWithTriggerRetry(admin, created.user.id, {
    full_name: fullName,
    role: 'admin',
    is_active: true,
    email,
  });
  if (!profile.ok) {
    // Roll back the auth user to avoid orphan
    const { error: delErr } = await admin.auth.admin.deleteUser(created.user.id);
    if (delErr) {
      console.error('signUpAdmin: rollback failed', { userId: created.user.id, delErr });
    }
    return { ok: false, error: `Ошибка профиля: ${profile.error}` };
  }

  return { ok: true };
}
