export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StoreDetailClient } from './store-detail-client';

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from('stores')
    .select(`
      *,
      resources:store_resources(*),
      manager:manager_id(id, full_name),
      tech_specialist:tech_specialist_id(id, full_name)
    `)
    .eq('id', id)
    .single();

  if (!store) notFound();

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, company_role')
    .eq('is_active', true)
    .order('full_name');

  const { data: settingsRows } = await supabase.from('settings').select('key, value');
  const settings: Record<string, number> = {};
  for (const row of settingsRows ?? []) {
    const n = parseFloat(row.value);
    if (!isNaN(n)) settings[row.key] = n;
  }

  return <StoreDetailClient store={store} users={users ?? []} settings={settings} />;
}
