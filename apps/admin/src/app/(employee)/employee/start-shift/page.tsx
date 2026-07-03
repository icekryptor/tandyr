import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StartShiftClient } from './start-shift-client';

export default async function StartShiftPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: openShift }, { data: stores }] = await Promise.all([
    supabase
      .from('shifts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .maybeSingle(),
    supabase.from('stores').select('id, name, address, latitude, longitude'),
  ]);

  if (openShift) redirect('/employee');

  return <StartShiftClient userId={user.id} stores={stores ?? []} />;
}
