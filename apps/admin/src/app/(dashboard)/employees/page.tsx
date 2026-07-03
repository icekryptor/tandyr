// service-role only — no cookie access, must stay dynamic
export const dynamic = 'force-dynamic';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { EmployeesClient, type EmployeeListItem } from './employees-client';

export default async function EmployeesPage() {
  // Use service role to bypass RLS for the admin panel
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: employees, error }, { data: stores }] = await Promise.all([
    admin
      .from('users')
      .select('id, full_name, email, phone, company_role, is_active, store:stores!users_store_id_fkey(name)')
      .order('full_name')
      .returns<EmployeeListItem[]>(),
    admin.from('stores').select('id, name').order('name'),
  ]);

  if (error) {
    console.error('[EmployeesPage] error:', error);
  }

  return <EmployeesClient employees={employees ?? []} stores={stores ?? []} />;
}
