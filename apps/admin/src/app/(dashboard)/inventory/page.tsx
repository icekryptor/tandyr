import { createClient } from '@/lib/supabase/server';
import { InventoryClient } from './inventory-client';

export default async function InventoryPage() {
  const supabase = await createClient();

  const [{ data: inventory }, { data: supplies }, { data: stores }] = await Promise.all([
    supabase
      .from('inventory')
      .select('*, store:stores(name)')
      .order('item_name'),
    supabase
      .from('supplies')
      .select('*, store:stores(name)')
      .order('supplied_at', { ascending: false })
      .limit(50),
    supabase.from('stores').select('id, name').order('name'),
  ]);

  return (
    <InventoryClient
      inventory={inventory ?? []}
      supplies={supplies ?? []}
      stores={stores ?? []}
    />
  );
}
