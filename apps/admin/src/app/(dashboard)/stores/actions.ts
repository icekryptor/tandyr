'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createStore(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('stores').insert({
    name: formData.get('name'),
    address: formData.get('address'),
    latitude: parseFloat(formData.get('latitude') as string),
    longitude: parseFloat(formData.get('longitude') as string),
  });
  if (error) return { error: error.message };
  revalidatePath('/stores');
  return { success: true };
}

export async function updateStore(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('stores').update({
    name: formData.get('name'),
    address: formData.get('address'),
    latitude: parseFloat(formData.get('latitude') as string),
    longitude: parseFloat(formData.get('longitude') as string),
  }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/stores');
  return { success: true };
}

export async function deleteStore(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('stores').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/stores');
  return { success: true };
}
