import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileClient, type ProfileRow } from './profile-client';

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, phone, avatar_url, store:stores(name, address)')
    .eq('id', user.id)
    .single()
    .returns<ProfileRow>();

  if (!profile) redirect('/login');

  return <ProfileClient profile={profile} />;
}
