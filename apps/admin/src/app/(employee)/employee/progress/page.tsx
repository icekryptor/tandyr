import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProgressClient } from './progress-client';

export default async function ProgressPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: openShift } = await supabase
    .from('shifts')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .maybeSingle();

  if (!openShift) redirect('/employee');

  return <ProgressClient shiftId={openShift.id} />;
}
