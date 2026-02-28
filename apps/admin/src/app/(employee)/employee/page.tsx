export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { EmployeeHome } from './employee-home';

export default async function EmployeePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: openShift } = await supabase
    .from('shifts')
    .select('*, store:stores(name, address)')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .maybeSingle();

  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, address')
    .order('name');

  const { data: recentShifts } = await supabase
    .from('shifts')
    .select('*, store:stores(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <EmployeeHome
      profile={profile}
      openShift={openShift}
      stores={stores ?? []}
      recentShifts={recentShifts ?? []}
    />
  );
}
