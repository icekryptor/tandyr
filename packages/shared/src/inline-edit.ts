// Field whitelists and parsing for the spreadsheet-style table views:
// one cell = one column update, so every column a table may write is listed here.

export type InlineFieldSpec =
  | { kind: 'text'; required?: boolean }
  | { kind: 'email' }
  | { kind: 'date' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'uuid' }
  | { kind: 'enum'; values: readonly string[] };

export type InlineValue = string | number | boolean | null;

const CHAINS = ['lenta', 'magnit', 'okey'] as const;
const COMPANY_ROLE_VALUES = ['baker', 'manager', 'tech_specialist', 'admin', 'owner'] as const;
const BANK_VALUES = ['sber', 'tbank', 'alfa', 'vtb', 'raiffeisen', 'gazprom', 'rosbank', 'otkrytie', 'other'] as const;

export const STORE_INLINE_FIELDS = {
  name: { kind: 'text', required: true },
  city: { kind: 'text' },
  chain: { kind: 'enum', values: CHAINS },
  contact_phone: { kind: 'text' },
  contact_email: { kind: 'email' },
  manager_id: { kind: 'uuid' },
  tech_specialist_id: { kind: 'uuid' },
} as const satisfies Record<string, InlineFieldSpec>;

export const EMPLOYEE_INLINE_FIELDS = {
  full_name: { kind: 'text', required: true },
  phone: { kind: 'text' },
  company_role: { kind: 'enum', values: COMPANY_ROLE_VALUES },
  store_id: { kind: 'uuid' },
  city: { kind: 'text' },
  is_active: { kind: 'boolean' },
  birth_date: { kind: 'date' },
  nationality: { kind: 'text' },
  passport_number: { kind: 'text' },
  patent_expires_at: { kind: 'date' },
  patent_region: { kind: 'text' },
  med_book_expires_at: { kind: 'date' },
  bank_name: { kind: 'enum', values: BANK_VALUES },
  card_number: { kind: 'text' },
  debt: { kind: 'number' },
} as const satisfies Record<string, InlineFieldSpec>;

export type StoreInlineField = keyof typeof STORE_INLINE_FIELDS;
export type EmployeeInlineField = keyof typeof EMPLOYEE_INLINE_FIELDS;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Turn a raw cell value into what the column stores; empty input clears nullable columns. */
export function parseInlineValue(
  spec: InlineFieldSpec,
  raw: InlineValue,
): { ok: true; value: InlineValue } | { ok: false; error: string } {
  if (spec.kind === 'boolean') {
    return typeof raw === 'boolean' ? { ok: true, value: raw } : { ok: false, error: 'Ожидается да/нет' };
  }
  const s = raw == null ? '' : String(raw).trim();
  if (s === '') {
    if (spec.kind === 'text' && spec.required) return { ok: false, error: 'Поле обязательно' };
    return { ok: true, value: spec.kind === 'number' ? 0 : null };
  }
  switch (spec.kind) {
    case 'text':
      return { ok: true, value: s };
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
        ? { ok: true, value: s.toLowerCase() }
        : { ok: false, error: 'Некорректный email' };
    case 'date': {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
      const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      return d && d.getUTCMonth() === +m![2] - 1 && d.getUTCDate() === +m![3]
        ? { ok: true, value: s }
        : { ok: false, error: 'Дата в формате ГГГГ-ММ-ДД' };
    }
    case 'number': {
      const n = Number(s.replace(',', '.').replace(/\s/g, ''));
      return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, error: 'Нужно число' };
    }
    case 'uuid':
      return UUID_RE.test(s) ? { ok: true, value: s } : { ok: false, error: 'Некорректная ссылка' };
    case 'enum':
      return spec.values.includes(s) ? { ok: true, value: s } : { ok: false, error: 'Недопустимое значение' };
  }
}
