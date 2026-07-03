import { createClient } from '@/lib/supabase/server';
import { StoresClient } from './stores-client';

export default async function StoresPage() {
  const supabase = await createClient();

  const initial = await supabase
    .from('stores')
    .select('*, resources:store_resources(*)')
    .order('name');

  let stores = initial.data;
  if (initial.error) {
    const fallback = await supabase
      .from('stores')
      .select('id, store_number, name, address, city, city_id, latitude, longitude, chain, contact_email, contact_phone, manager_id, tech_specialist_id, created_at')
      .order('name');
    stores = fallback.data;
  }

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, company_role')
    .eq('is_active', true)
    .order('full_name');

  return <StoresClient stores={stores ?? []} users={users ?? []} />;
}
