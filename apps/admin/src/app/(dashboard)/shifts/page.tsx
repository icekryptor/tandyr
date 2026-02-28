export const dynamic = 'force-dynamic';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { ShiftsClient } from './shifts-client';

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; status?: string; date?: string }>;
}) {
  const params = await searchParams;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let query = admin
    .from('shifts')
    .select('*, user:users(id, full_name, email), store:stores(id, name)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (params.store) query = query.eq('store_id', params.store);
  if (params.status) query = query.eq('status', params.status);
  if (params.date) {
    query = query
      .gte('start_time', `${params.date}T00:00:00`)
      .lte('start_time', `${params.date}T23:59:59`);
  }

  const [{ data: shifts }, { data: stores }] = await Promise.all([
    query,
    admin.from('stores').select('id, name').order('name'),
  ]);

  return <ShiftsClient shifts={shifts ?? []} stores={stores ?? []} />;
}
