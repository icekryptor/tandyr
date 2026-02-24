import { createClient } from '@/lib/supabase/server';
import { ShiftsClient } from './shifts-client';

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; status?: string; date?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('shifts')
    .select('*, user:users(full_name, email), store:stores(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (params.store) query = query.eq('store_id', params.store);
  if (params.status) query = query.eq('status', params.status);
  if (params.date) {
    query = query
      .gte('start_time', `${params.date}T00:00:00`)
      .lte('start_time', `${params.date}T23:59:59`);
  }

  const [{ data: shifts }, { data: stores }] = await Promise.all([
    query,
    supabase.from('stores').select('id, name').order('name'),
  ]);

  return <ShiftsClient shifts={shifts ?? []} stores={stores ?? []} />;
}
