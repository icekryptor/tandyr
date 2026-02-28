export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: me } = await supabase
    .from('users')
    .select('company_role')
    .single();

  if (!me || !['owner', 'admin'].includes(me.company_role ?? '')) {
    redirect('/');
  }

  const { data: rows } = await supabase
    .from('settings')
    .select('key, value, description');

  const settings: Record<string, string> = {};
  for (const row of rows ?? []) {
    settings[row.key] = row.value;
  }

  return <SettingsClient settings={settings} />;
}
