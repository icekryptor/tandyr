'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GridCell, GridTable, SelectCell, TextCell, ViewToggle } from '@/components/data-grid';
import {
  BANK_LABELS, COMPANY_ROLES, pluralize,
  type EmployeeInlineField, type InlineValue, type Store, type User,
} from '@tandyr/shared';
import { updateEmployeeField } from './actions';

export type EmployeeRow = Pick<User,
  | 'id' | 'full_name' | 'email' | 'phone' | 'company_role' | 'is_active' | 'store_id' | 'city' | 'birth_date'
  | 'nationality' | 'passport_number' | 'patent_expires_at' | 'patent_region' | 'med_book_expires_at'
  | 'bank_name' | 'card_number' | 'debt'>;

const BANK_OPTIONS = Object.entries(BANK_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = [
  { value: 'true', label: 'Активен' },
  { value: 'false', label: 'Заблокирован' },
];

const COLUMNS = [
  { label: 'ФИО', width: 260 },
  { label: 'Email', width: 220 },
  { label: 'Телефон', width: 160 },
  { label: 'Роль', width: 150 },
  { label: 'Магазин', width: 240 },
  { label: 'Город', width: 175 },
  { label: 'Статус', width: 140 },
  { label: 'Дата рождения', width: 140 },
  { label: 'Гражданство', width: 140 },
  { label: 'Паспорт', width: 140 },
  { label: 'Патент до', width: 140 },
  { label: 'Регион патента', width: 160 },
  { label: 'Медкнижка до', width: 140 },
  { label: 'Банк', width: 150 },
  { label: 'Карта', width: 190 },
  { label: 'Долг, ₽', width: 100 },
  { label: '', width: 40 },
];

export function EmployeesTable({
  employees, stores, cities,
}: {
  employees: EmployeeRow[];
  stores: Pick<Store, 'id' | 'name'>[];
  cities: string[];
}) {
  const [search, setSearch] = useState('');
  const storeOptions = stores.map((s) => ({ value: s.id, label: s.name }));

  const q = search.trim().toLowerCase();
  const filtered = q
    ? employees.filter((e) => [e.full_name, e.email, e.phone, e.passport_number, e.city]
        .some((v) => v?.toLowerCase().includes(q)))
    : employees;

  const saver = (id: string, field: EmployeeInlineField) => (value: InlineValue) => updateEmployeeField(id, field, value);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Сотрудники</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} {pluralize(filtered.length, 'сотрудник', 'сотрудника', 'сотрудников')} · правки сохраняются сразу
          </p>
        </div>
        <ViewToggle view="table" />
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по ФИО, email, телефону, паспорту…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <datalist id="employee-cities">
        {cities.map((c) => <option key={c} value={c} />)}
      </datalist>

      <GridTable columns={COLUMNS}>
        {filtered.map((e) => (
          <tr key={e.id} className={e.is_active ? undefined : 'text-muted-foreground'}>
            <GridCell sticky>
              <TextCell col="full_name" value={e.full_name} onSave={saver(e.id, 'full_name')} />
            </GridCell>
            <GridCell className="px-2">
              <span className="block truncate text-xs text-muted-foreground" title={e.email}>{e.email}</span>
            </GridCell>
            <GridCell>
              <TextCell col="phone" type="tel" value={e.phone} onSave={saver(e.id, 'phone')} />
            </GridCell>
            <GridCell>
              <SelectCell col="company_role" value={e.company_role} onSave={saver(e.id, 'company_role')} options={COMPANY_ROLES} />
            </GridCell>
            <GridCell>
              <SelectCell
                col="store_id"
                value={e.store_id}
                onSave={saver(e.id, 'store_id')}
                options={storeOptions}
                emptyLabel="Не назначен"
              />
            </GridCell>
            <GridCell>
              <TextCell col="city" value={e.city} onSave={saver(e.id, 'city')} list="employee-cities" />
            </GridCell>
            <GridCell>
              <SelectCell
                col="is_active"
                value={String(e.is_active)}
                onSave={(v) => updateEmployeeField(e.id, 'is_active', v === 'true')}
                options={STATUS_OPTIONS}
                emptyLabel={null}
              />
            </GridCell>
            <GridCell>
              <TextCell col="birth_date" type="date" value={e.birth_date} onSave={saver(e.id, 'birth_date')} />
            </GridCell>
            <GridCell>
              <TextCell col="nationality" value={e.nationality} onSave={saver(e.id, 'nationality')} />
            </GridCell>
            <GridCell>
              <TextCell col="passport_number" value={e.passport_number} onSave={saver(e.id, 'passport_number')} />
            </GridCell>
            <GridCell>
              <TextCell col="patent_expires_at" type="date" value={e.patent_expires_at} onSave={saver(e.id, 'patent_expires_at')} />
            </GridCell>
            <GridCell>
              <TextCell col="patent_region" value={e.patent_region} onSave={saver(e.id, 'patent_region')} />
            </GridCell>
            <GridCell>
              <TextCell col="med_book_expires_at" type="date" value={e.med_book_expires_at} onSave={saver(e.id, 'med_book_expires_at')} />
            </GridCell>
            <GridCell>
              <SelectCell col="bank_name" value={e.bank_name} onSave={saver(e.id, 'bank_name')} options={BANK_OPTIONS} />
            </GridCell>
            <GridCell>
              <TextCell col="card_number" value={e.card_number} onSave={saver(e.id, 'card_number')} />
            </GridCell>
            <GridCell>
              <TextCell col="debt" type="number" value={e.debt} onSave={saver(e.id, 'debt')} />
            </GridCell>
            <GridCell>
              <Link
                href={`/employees/${e.id}`}
                title="Открыть карточку"
                className="flex h-9 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </GridCell>
          </tr>
        ))}
        {filtered.length === 0 && (
          <tr>
            <td colSpan={COLUMNS.length} className="text-center text-muted-foreground py-10">Сотрудники не найдены</td>
          </tr>
        )}
      </GridTable>
    </div>
  );
}
