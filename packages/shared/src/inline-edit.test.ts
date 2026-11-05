// Run: node --test packages/shared/src/inline-edit.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPLOYEE_INLINE_FIELDS, STORE_INLINE_FIELDS, parseInlineValue } from './inline-edit.ts';

test('required text rejects empty, optional text clears to null', () => {
  assert.deepEqual(parseInlineValue(STORE_INLINE_FIELDS.name, '   '), { ok: false, error: 'Поле обязательно' });
  assert.deepEqual(parseInlineValue(STORE_INLINE_FIELDS.city, ''), { ok: true, value: null });
  assert.deepEqual(parseInlineValue(STORE_INLINE_FIELDS.city, '  Казань '), { ok: true, value: 'Казань' });
});

test('email is validated and lowercased', () => {
  assert.deepEqual(parseInlineValue(STORE_INLINE_FIELDS.contact_email, 'Ivan@Lenta.com'), { ok: true, value: 'ivan@lenta.com' });
  assert.equal(parseInlineValue(STORE_INLINE_FIELDS.contact_email, 'ivan@').ok, false);
});

test('dates must be real ISO dates', () => {
  assert.deepEqual(parseInlineValue(EMPLOYEE_INLINE_FIELDS.birth_date, '1990-02-28'), { ok: true, value: '1990-02-28' });
  assert.equal(parseInlineValue(EMPLOYEE_INLINE_FIELDS.birth_date, '1990-02-30').ok, false);
  assert.equal(parseInlineValue(EMPLOYEE_INLINE_FIELDS.birth_date, '28.02.1990').ok, false);
});

test('numbers accept comma and spaces, empty debt is zero', () => {
  assert.deepEqual(parseInlineValue(EMPLOYEE_INLINE_FIELDS.debt, '1 500,5'), { ok: true, value: 1500.5 });
  assert.deepEqual(parseInlineValue(EMPLOYEE_INLINE_FIELDS.debt, ''), { ok: true, value: 0 });
  assert.equal(parseInlineValue(EMPLOYEE_INLINE_FIELDS.debt, 'abc').ok, false);
});

test('enums, uuids and booleans are checked', () => {
  assert.deepEqual(parseInlineValue(STORE_INLINE_FIELDS.chain, 'magnit'), { ok: true, value: 'magnit' });
  assert.equal(parseInlineValue(STORE_INLINE_FIELDS.chain, 'auchan').ok, false);
  assert.deepEqual(parseInlineValue(STORE_INLINE_FIELDS.chain, ''), { ok: true, value: null });
  assert.equal(parseInlineValue(EMPLOYEE_INLINE_FIELDS.store_id, 'not-a-uuid').ok, false);
  assert.equal(parseInlineValue(EMPLOYEE_INLINE_FIELDS.store_id, '0b9c3f0e-1d2a-4c55-9a1e-3c2d1e0f9a8b').ok, true);
  assert.deepEqual(parseInlineValue(EMPLOYEE_INLINE_FIELDS.is_active, false), { ok: true, value: false });
  assert.equal(parseInlineValue(EMPLOYEE_INLINE_FIELDS.is_active, 'false').ok, false);
});
