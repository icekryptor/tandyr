import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EndShiftClient } from './end-shift-client';

export default async function EndShiftPage() {
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

  return <EndShiftClient userId={user.id} shiftId={openShift.id} />;
}
