export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { StoresClient } from './stores-client';

export default async function StoresPage() {
  const supabase = await createClient();

  let { data: stores, error } = await supabase
    .from('stores')
    .select('*, resources:store_resources(*)')
    .order('name');

  if (error) {
    const fallback = await supabase.from('stores').select('*').order('name');
    stores = fallback.data;
  }

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, company_role')
    .eq('is_active', true)
    .order('full_name');

  return <StoresClient stores={stores ?? []} users={users ?? []} />;
}
