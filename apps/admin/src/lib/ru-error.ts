const GENERIC = 'Что-то пошло не так. Попробуйте ещё раз.';

/** Map raw (usually English) Supabase/Postgres error messages to user-facing Russian. */
export function ruError(message: string | null | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (!m) return GENERIC;
  if (m.includes('row-level security')) return 'Недостаточно прав для этого действия.';
  if (m.includes('already exists') || m.includes('duplicate')) return 'Такая запись уже существует.';
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) return 'Проблема с соединением. Проверьте интернет.';
  if (m.includes('unique') && m.includes('open')) return 'У вас уже есть открытая смена.';
  return GENERIC;
}
