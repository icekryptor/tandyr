'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addSupply(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from('supplies').insert({
    store_id: formData.get('store_id'),
    item_name: formData.get('item_name'),
    quantity: parseFloat(formData.get('quantity') as string),
    unit: formData.get('unit'),
    supplier: formData.get('supplier') || null,
    supplied_at: formData.get('supplied_at') || new Date().toISOString().slice(0, 10),
  });

  if (error) return { error: error.message };
  revalidatePath('/inventory');
  return { success: true };
}
