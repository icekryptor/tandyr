import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StartShiftClient } from './start-shift-client';

export default async function StartShiftPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: openShift }, { data: stores }, { data: profile }, { data: assigned }] = await Promise.all([
    supabase
      .from('shifts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .maybeSingle(),
    supabase.from('stores').select('id, name, address, latitude, longitude').order('name'),
    supabase.from('users').select('store_id').eq('id', user.id).maybeSingle(),
    supabase.from('user_stores').select('store_id').eq('user_id', user.id),
  ]);

  if (openShift) redirect('/employee');

  // The employee's own stores come first when the store is picked by hand.
  const myStoreIds = [
    ...new Set([profile?.store_id, ...(assigned ?? []).map((a) => a.store_id)].filter(Boolean)),
  ] as string[];

  return <StartShiftClient userId={user.id} stores={stores ?? []} myStoreIds={myStoreIds} />;
}
