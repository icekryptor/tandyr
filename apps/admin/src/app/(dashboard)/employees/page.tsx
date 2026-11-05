// service-role only — no cookie access, must stay dynamic
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';
import { EmployeesClient, type EmployeeListItem } from './employees-client';
import { EmployeesTable, type EmployeeRow } from './employees-table';

const TABLE_COLUMNS =
  'id, full_name, email, phone, company_role, is_active, store_id, city, birth_date, nationality, passport_number, ' +
  'patent_expires_at, patent_region, med_book_expires_at, bank_name, card_number, debt';

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const view = (await searchParams).view === 'table' ? 'table' : 'list';

  // The service-role reads below include passports and cards; don't rely on the layout gate alone.
  if (!(await requireAdmin()).ok) redirect('/employee');

  // Use service role to bypass RLS for the admin panel
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  if (view === 'table') {
    const [{ data: employees, error }, { data: stores }, { data: cities }] = await Promise.all([
      admin.from('users').select(TABLE_COLUMNS).order('full_name').returns<EmployeeRow[]>(),
      admin.from('stores').select('id, name').order('name'),
      admin.from('cities').select('name').order('name'),
    ]);
    if (error) console.error('[EmployeesPage] error:', error);
    return (
      <EmployeesTable
        employees={employees ?? []}
        stores={stores ?? []}
        cities={(cities ?? []).map((c) => c.name)}
      />
    );
  }

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
