const GENERIC = 'Что-то пошло не так. Попробуйте ещё раз.';

/** Map raw (usually English) Supabase/Postgres error messages to user-facing Russian. */
export function ruError(message: string | null | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (!m) return GENERIC;
  if (m.includes('row-level security')) return 'Недостаточно прав для этого действия.';
  // uniq_open_shift_per_user violations contain both "duplicate" and the
  // index name — match them before the generic duplicate branch.
  if (m.includes('uniq_open_shift') || (m.includes('unique') && m.includes('open'))) {
    return 'У вас уже есть открытая смена.';
  }
  if (m.includes('already exists') || m.includes('duplicate')) return 'Такая запись уже существует.';
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) return 'Проблема с соединением. Проверьте интернет.';
  return GENERIC;
}
