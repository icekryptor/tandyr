import { createClient } from '@/lib/supabase/server';
import { EmployeesClient } from './employees-client';

export default async function EmployeesPage() {
  const supabase = await createClient();

  const [{ data: employees }, { data: stores }] = await Promise.all([
    supabase
      .from('users')
      .select('*, store:stores(name)')
      .eq('role', 'employee')
      .order('full_name'),
    supabase.from('stores').select('id, name').order('name'),
  ]);

  return <EmployeesClient employees={employees ?? []} stores={stores ?? []} />;
}
