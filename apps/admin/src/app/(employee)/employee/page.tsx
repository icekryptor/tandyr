import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EmployeeHome, type HubOpenShift, type HubRecentShift } from './employee-home';

export default async function EmployeePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, supabase] = await Promise.all([searchParams, createClient()]);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: openShift }, { data: recentShifts }] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, avatar_url, store_id')
      .eq('id', user.id)
      .single(),
    supabase
      .from('shifts')
      .select('id, start_time, store:stores(name, address)')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .maybeSingle()
      .returns<HubOpenShift | null>(),
    supabase
      .from('shifts')
      .select('id, start_time, end_time, production_kg, status, store:stores(name)')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .order('start_time', { ascending: false })
      .limit(5)
      .returns<HubRecentShift[]>(),
  ]);

  return (
    <EmployeeHome
      profile={profile}
      openShift={openShift}
      recentShifts={recentShifts ?? []}
      started={params.started === '1'}
      ended={params.ended === '1'}
    />
  );
}
