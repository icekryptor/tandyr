import { createClient } from '@/lib/supabase/server';
import { SalaryClient } from './salary-client';

export default async function SalaryPage() {
  const supabase = await createClient();

  const [{ data: salaryRecords }, { data: employees }] = await Promise.all([
    supabase
      .from('salary_records')
      .select('*, user:users(full_name, email)')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'employee')
      .eq('is_active', true)
      .order('full_name'),
  ]);

  return <SalaryClient records={salaryRecords ?? []} employees={employees ?? []} />;
}
