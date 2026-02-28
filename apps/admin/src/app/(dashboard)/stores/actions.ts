'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function safeFloat(v: FormDataEntryValue | null, fallback = 0): number {
  if (!v) return fallback;
  const n = parseFloat(v as string);
  return isNaN(n) ? fallback : n;
}

export async function createStore(formData: FormData) {
  const supabase = await createClient();

  const name = (formData.get('name') as string)?.trim();
  const address = (formData.get('address') as string)?.trim();
  if (!name) return { error: 'Название обязательно' };
  if (!address) return { error: 'Адрес обязателен' };

  const lat = safeFloat(formData.get('latitude'));
  const lon = safeFloat(formData.get('longitude'));
  if (lat === 0 && lon === 0) return { error: 'Укажите адрес на карте' };

  const { error } = await supabase.from('stores').insert({
    name,
    address,
    city: formData.get('city') || null,
    latitude: lat,
    longitude: lon,
    chain: formData.get('chain') || null,
    contact_email: formData.get('contact_email') || null,
    contact_phone: formData.get('contact_phone') || null,
    manager_id: formData.get('manager_id') || null,
    tech_specialist_id: formData.get('tech_specialist_id') || null,
  });
  if (error) return { error: error.message };
  revalidatePath('/stores');
  return { success: true };
}

export async function updateStore(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = (formData.get('name') as string)?.trim();
  const address = (formData.get('address') as string)?.trim();
  if (!name) return { error: 'Название обязательно' };
  if (!address) return { error: 'Адрес обязателен' };

  const lat = safeFloat(formData.get('latitude'));
  const lon = safeFloat(formData.get('longitude'));

  const { error } = await supabase.from('stores').update({
    name,
    address,
    city: formData.get('city') || null,
    latitude: lat,
    longitude: lon,
    chain: formData.get('chain') || null,
    contact_email: formData.get('contact_email') || null,
    contact_phone: formData.get('contact_phone') || null,
    manager_id: formData.get('manager_id') || null,
    tech_specialist_id: formData.get('tech_specialist_id') || null,
  }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/stores');
  revalidatePath(`/stores/${id}`);
  return { success: true };
}

export async function deleteStore(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('stores').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/stores');
  return { success: true };
}

export async function updateResource(resourceId: string, quantityKg: number) {
  const supabase = await createClient();

  const { data: resource } = await supabase
    .from('store_resources')
    .select('store_id')
    .eq('id', resourceId)
    .single();

  const { error } = await supabase
    .from('store_resources')
    .update({ quantity_kg: quantityKg, updated_at: new Date().toISOString() })
    .eq('id', resourceId);
  if (error) return { error: error.message };

  revalidatePath('/stores');
  if (resource?.store_id) revalidatePath(`/stores/${resource.store_id}`);
  return { success: true };
}
