/**
 * Haversine formula — distance between two GPS points in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export interface StoreWithDistance {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
}

export function findNearestStore<T extends { id: string; name: string; address: string; latitude: number; longitude: number }>(
  stores: T[],
  lat: number,
  lng: number,
): (T & { distance: number }) | null {
  if (!stores.length) return null;
  return stores
    .map((s) => ({ ...s, distance: haversineDistance(lat, lng, s.latitude, s.longitude) }))
    .sort((a, b) => a.distance - b.distance)[0];
}

export function formatKg(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} кг`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
