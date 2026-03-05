export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const supabase = await createClient();
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get current user from auth session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Use admin client to check role (bypasses RLS)
  const { data: me } = await admin
    .from('users')
    .select('company_role')
    .eq('id', user.id)
    .single();

  if (!me || !['owner', 'admin'].includes(me.company_role ?? '')) {
    redirect('/');
  }

  // Use admin client for settings too
  const { data: rows } = await admin
    .from('settings')
    .select('key, value, description');

  const settings: Record<string, string> = {};
  for (const row of rows ?? []) {
    settings[row.key] = row.value;
  }

  return <SettingsClient settings={settings} />;
}
