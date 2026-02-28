export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { ShiftDetailClient } from './shift-detail-client';

export default async function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: shift } = await admin
    .from('shifts')
    .select('*, user:users(id, full_name, email), store:stores(id, name)')
    .eq('id', id)
    .single();

  if (!shift) notFound();

  return <ShiftDetailClient shift={shift} />;
}
