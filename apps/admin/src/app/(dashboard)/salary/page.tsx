export const dynamic = 'force-dynamic';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { SalaryClient } from './salary-client';

export default async function SalaryPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; year?: string }>;
}) {
  const params = await searchParams;
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Default: current ISO week
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const thursday = new Date(now);
  thursday.setDate(now.getDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(thursday.getFullYear(), 0, 1));
  const currentWeek = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const currentYear = thursday.getFullYear();

  const filterWeek = params.week ? parseInt(params.week) : currentWeek;
  const filterYear = params.year ? parseInt(params.year) : currentYear;

  const [{ data: records }, { data: employees }] = await Promise.all([
    admin
      .from('weekly_salaries')
      .select('*, user:users(id, full_name, email)')
      .eq('week_number', filterWeek)
      .eq('week_year', filterYear)
      .order('created_at', { ascending: false }),
    admin
      .from('users')
      .select('id, full_name, email')
      .eq('is_active', true)
      .order('full_name'),
  ]);

  return (
    <SalaryClient
      records={records ?? []}
      employees={employees ?? []}
      currentWeek={filterWeek}
      currentYear={filterYear}
    />
  );
}
