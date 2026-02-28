export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { InventoryClient } from './inventory-client';

export default async function InventoryPage() {
  const supabase = await createClient();

  const [{ data: inventory }, { data: supplies }, { data: stores }, { data: inventoryActs }] = await Promise.all([
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
    supabase
      .from('inventory_acts')
      .select('*, store:stores(name), user:users(full_name), items:inventory_act_items(*)')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  return (
    <InventoryClient
      inventory={inventory ?? []}
      supplies={supplies ?? []}
      stores={stores ?? []}
      inventoryActs={inventoryActs ?? []}
    />
  );
}
