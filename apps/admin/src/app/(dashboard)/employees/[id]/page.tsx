export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { EmployeeDetailClient } from './employee-detail-client';

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: employee }, { data: stores }, { data: cities }, { data: userCities }] = await Promise.all([
    admin
      .from('users')
      .select('*, store:stores!users_store_id_fkey(id, name)')
      .eq('id', id)
      .single(),
    admin.from('stores').select('id, name').order('name'),
    admin.from('cities').select('id, name').order('name'),
    admin.from('user_cities').select('city_id').eq('user_id', id),
  ]);

  if (!employee) notFound();

  const assignedCityIds = (userCities ?? []).map((r: any) => r.city_id);

  return (
    <EmployeeDetailClient
      employee={employee}
      stores={stores ?? []}
      cities={cities ?? []}
      assignedCityIds={assignedCityIds}
    />
  );
}
