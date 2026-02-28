export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { EmployeesClient } from './employees-client';

export default async function EmployeesPage() {
  // Use service role to bypass RLS for the admin panel
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: employees, error }, { data: stores }] = await Promise.all([
    admin
      .from('users')
      .select('*, store:stores!users_store_id_fkey(id, name)')
      .order('full_name'),
    admin.from('stores').select('id, name').order('name'),
  ]);

  if (error) {
    console.error('[EmployeesPage] error:', error);
  }

  return <EmployeesClient employees={employees ?? []} stores={stores ?? []} />;
}
