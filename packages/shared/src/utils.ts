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

export const CHAIN_LABELS: Record<string, string> = {
  lenta: 'Лента',
  magnit: 'Магнит',
  okey: 'ОКЕЙ',
};

export const RESOURCE_LABELS: Record<string, string> = {
  flour: 'Мука',
  sugar: 'Сахар',
  salt: 'Соль',
  oil: 'Масло',
  dry_milk: 'Сухое молоко',
  yeast: 'Дрожжи',
};

export const ALL_RESOURCES = ['flour', 'sugar', 'salt', 'oil', 'dry_milk', 'yeast'] as const;

export const COMPANY_ROLE_LABELS: Record<string, string> = {
  baker: 'Пекарь',
  manager: 'Управляющий',
  tech_specialist: 'Тех. специалист',
  admin: 'Администратор',
  owner: 'Владелец',
};

export const COMPANY_ROLE_COLORS: Record<string, string> = {
  baker: 'bg-amber-100 text-amber-800',
  manager: 'bg-blue-100 text-blue-800',
  tech_specialist: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
  owner: 'bg-green-100 text-green-800',
};

export const BANK_LABELS: Record<string, string> = {
  sber: 'Сбербанк',
  tbank: 'Т-Банк',
  alfa: 'Альфа-Банк',
  vtb: 'ВТБ',
  raiffeisen: 'Райффайзен',
  gazprom: 'Газпромбанк',
  rosbank: 'Росбанк',
  otkrytie: 'Открытие',
  other: 'Другой',
};

// ─── FormData / Server Action helpers ────────────────────────────────────────

/** Parse float safely — returns fallback instead of NaN */
export function safeFloat(v: unknown, fallback = 0): number {
  if (v == null || v === '') return fallback;
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

/** Parse float that returns null instead of NaN (for nullable DB columns) */
export function safeFloatOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

/** Convert empty strings and sentinel values to null (for FK / nullable fields) */
export function nullifyEmpty(v: string | null | undefined, sentinel = '__none__'): string | null {
  if (!v || v === sentinel) return null;
  return v;
}

// ─── Status / label constants ────────────────────────────────────────────────

export const TECH_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  in_progress: 'В работе',
  resolved: 'Решено',
};

export const TECH_REQUEST_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

export const INVENTORY_ACT_STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  completed: 'Выполнен',
  overdue: 'Просрочен',
};

export const INVENTORY_ACT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

export const SHIFT_STATUS_LABELS: Record<string, string> = {
  open: 'Открыта',
  closed: 'Закрыта',
};

// ─── Misc ────────────────────────────────────────────────────────────────────

export const RUSSIAN_CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Уфа', 'Ростов-на-Дону',
  'Краснодар', 'Омск', 'Воронеж', 'Пермь', 'Волгоград',
  'Красноярск', 'Саратов', 'Тюмень', 'Тольятти', 'Ижевск',
  'Барнаул', 'Иркутск', 'Хабаровск', 'Ярославль', 'Владивосток',
  'Махачкала', 'Томск', 'Оренбург', 'Кемерово', 'Новокузнецк',
  'Рязань', 'Астрахань', 'Набережные Челны', 'Пенза', 'Липецк',
  'Киров', 'Чебоксары', 'Тула', 'Калининград', 'Курск',
] as const;
