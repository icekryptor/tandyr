import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TechRequestClient } from './tech-request-client';

export default async function TechRequestPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <TechRequestClient userId={user.id} />;
}
