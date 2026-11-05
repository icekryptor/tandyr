import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Verify the caller is an admin. Server actions can be POSTed directly,
 * bypassing the (dashboard) layout's role gate — so every service-role
 * mutation (and every page that reads PII with the service role) must re-check.
 */
export async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизованы' };

  const admin = createAdminClient();
  const { data: me } = await admin
    .from('users')
    .select('role, company_role')
    .eq('id', user.id)
    .single();
  const isSystemAdmin = me?.role === 'admin';
  const isBusinessAdmin = ['owner', 'admin'].includes(me?.company_role ?? '');
  if (!me || (!isSystemAdmin && !isBusinessAdmin)) {
    return { ok: false, error: 'Недостаточно прав' };
  }
  return { ok: true, userId: user.id };
}
