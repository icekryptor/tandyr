export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { TechRequestsClient } from './tech-requests-client';

export default async function TechRequestsPage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from('tech_requests')
    .select('*, user:users(id, full_name, email), store:stores(id, name)')
    .order('created_at', { ascending: false });

  return <TechRequestsClient requests={requests ?? []} />;
}
