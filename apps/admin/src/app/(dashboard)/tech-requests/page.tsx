import { createClient } from '@/lib/supabase/server';
import { TechRequestsClient } from './tech-requests-client';

export default async function TechRequestsPage() {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from('tech_requests')
    .select('*, user:users(full_name, email)')
    .order('created_at', { ascending: false });

  return <TechRequestsClient requests={requests ?? []} />;
}
