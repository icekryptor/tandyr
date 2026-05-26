'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';

import { updateUserProfileWithTriggerRetry } from '@/lib/supabase/profile-update';

type AcceptResult = { ok: true } | { ok: false; error: string };

export async function acceptInvite(formData: FormData): Promise<AcceptResult> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const emailField = String(formData.get('email') ?? '').trim();
  const storeField = String(formData.get('store_id') ?? '');
  const roleField = String(formData.get('company_role') ?? '');

  if (!token || !password || !fullName || !emailField) {
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

  const { data: invite } = await admin
    .from('invites')
    .select('id, email, store_id, company_role, used_at, expires_at')
    .eq('token', token)
    .single();

  if (!invite) return { ok: false, error: 'Инвайт не найден.' };
  if (invite.used_at) return { ok: false, error: 'Инвайт уже использован.' };
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'Срок действия инвайта истёк.' };
  }

  // If the invite pre-set a value, force it (don't trust client override)
  const finalEmail = invite.email ?? emailField;
  const finalStore = invite.store_id ?? (storeField || null);
  const finalRole = invite.company_role ?? (roleField || null);

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: finalEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (cErr || !created.user) {
    const raw = cErr?.message ?? '';
    if (/already/i.test(raw) || /exists/i.test(raw) || /registered/i.test(raw)) {
      return { ok: false, error: 'Аккаунт с таким email уже зарегистрирован. Попробуйте войти.' };
    }
    return { ok: false, error: raw || 'Не удалось создать аккаунт.' };
  }

  // The on_auth_user_created trigger inserts the public.users row
  // asynchronously, so retry with backoff until the row exists (otherwise
  // UPDATE matches 0 rows and silently succeeds, leaving an orphan profile).
  const profile = await updateUserProfileWithTriggerRetry(admin, created.user.id, {
    full_name: fullName,
    role: 'employee',
    company_role: finalRole,
    store_id: finalStore,
    is_active: true,
    email: finalEmail,
  });

  if (!profile.ok) {
    const { error: delErr } = await admin.auth.admin.deleteUser(created.user.id);
    if (delErr) {
      console.error('acceptInvite: rollback failed', { userId: created.user.id, delErr });
    }
    return { ok: false, error: `Ошибка профиля: ${profile.error}` };
  }

  // Atomically claim the invite: only succeeds if used_at is still NULL.
  // Two concurrent acceptors can both pass the earlier "used_at IS NULL"
  // check; the loser of this race must roll back its auth user.
  const { data: claimed, error: claimErr } = await admin
    .from('invites')
    .update({ used_at: new Date().toISOString(), used_by_user_id: created.user.id })
    .eq('id', invite.id)
    .is('used_at', null)
    .select('id');

  if (claimErr) {
    console.error('acceptInvite: mark-used UPDATE errored', { inviteId: invite.id, claimErr });
  }
  if (!claimed || claimed.length === 0) {
    // Lost the race — another acceptor won. Roll back our auth user.
    const { error: delErr } = await admin.auth.admin.deleteUser(created.user.id);
    if (delErr) {
      console.error('acceptInvite: rollback after losing race failed', { userId: created.user.id, delErr });
    }
    return { ok: false, error: 'Этой ссылкой уже воспользовались.' };
  }

  return { ok: true };
}
