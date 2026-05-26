import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * After auth.admin.createUser, the on_auth_user_created trigger inserts
 * the public.users row asynchronously. Update the row with the desired
 * profile fields, retrying with backoff if the trigger hasn't fired yet
 * (UPDATE matches zero rows -> retry).
 */
export async function updateUserProfileWithTriggerRetry(
  admin: SupabaseClient,
  userId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Backoffs in ms: total max ~2.25s before giving up
  const backoffs = [150, 250, 400, 600, 850];
  for (const wait of backoffs) {
    await new Promise((r) => setTimeout(r, wait));
    const { data, error } = await admin
      .from('users')
      .update(patch)
      .eq('id', userId)
      .select('id');
    if (error) return { ok: false, error: error.message };
    if (data && data.length > 0) return { ok: true };
  }
  return { ok: false, error: 'Профиль не был создан триггером после нескольких попыток.' };
}
