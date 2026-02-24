import { createClient } from '@/lib/supabase/server';
import { StoresClient } from './stores-client';

export default async function StoresPage() {
  const supabase = await createClient();
  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .order('name');

  return <StoresClient stores={stores ?? []} />;
}
