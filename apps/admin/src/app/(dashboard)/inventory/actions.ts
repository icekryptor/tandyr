'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addSupply(formData: FormData) {
  const supabase = await createClient();

  const store_id = formData.get('store_id') as string;
  const item_name = (formData.get('item_name') as string)?.trim();
  const rawQty = parseFloat(formData.get('quantity') as string);

  if (!store_id) return { error: 'Выберите магазин' };
  if (!item_name) return { error: 'Укажите наименование' };
  if (isNaN(rawQty) || rawQty <= 0) return { error: 'Количество должно быть > 0' };

  const { error } = await supabase.from('supplies').insert({
    store_id,
    item_name,
    quantity: rawQty,
    unit: formData.get('unit') || 'кг',
    supplier: formData.get('supplier') || null,
    supplied_at: formData.get('supplied_at') || new Date().toISOString().slice(0, 10),
  });

  if (error) return { error: error.message };
  revalidatePath('/inventory');
  return { success: true };
}
