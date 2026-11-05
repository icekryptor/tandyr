'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GridCell, GridTable, SelectCell, TextCell, ViewToggle } from '@/components/data-grid';
import { CHAIN_LABELS, pluralize, type InlineValue, type Store, type StoreInlineField } from '@tandyr/shared';
import { updateStoreField } from './actions';

type StaffUser = { id: string; full_name: string; company_role: string | null };

const CHAIN_OPTIONS = Object.entries(CHAIN_LABELS).map(([value, label]) => ({ value, label }));

const COLUMNS = [
  { label: 'Магазин', width: 260 },
  { label: '№', width: 56 },
  { label: 'Город', width: 175 },
  { label: 'Сеть', width: 110 },
  { label: 'Адрес', width: 300 },
  { label: 'Телефон', width: 170 },
  { label: 'Email', width: 230 },
  { label: 'Управляющий', width: 200 },
  { label: 'Тех. специалист', width: 200 },
  { label: '', width: 40 },
];

/** Options for a staff select; keeps the current assignee visible even if their role changed or they left. */
function staffOptions(staff: StaffUser[], all: StaffUser[], current: string | null) {
  const options = staff.map((u) => ({ value: u.id, label: u.full_name }));
  if (current && !options.some((o) => o.value === current)) {
    const person = all.find((u) => u.id === current);
    options.unshift({ value: current, label: person ? person.full_name : '(неактивный)' });
  }
  return options;
}

export function StoresTable({ stores, users, cities }: { stores: Store[]; users: StaffUser[]; cities: string[] }) {
  const [search, setSearch] = useState('');
  const managers = users.filter((u) => u.company_role === 'manager');
  const techSpecs = users.filter((u) => u.company_role === 'tech_specialist');

  const q = search.trim().toLowerCase();
  const filtered = q
    ? stores.filter((s) => [s.name, s.city, s.address, s.contact_email, s.contact_phone]
        .some((v) => v?.toLowerCase().includes(q)))
    : stores;

  const saver = (id: string, field: StoreInlineField) => (value: InlineValue) => updateStoreField(id, field, value);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Магазины</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} {pluralize(filtered.length, 'точка', 'точки', 'точек')} · правки сохраняются сразу
          </p>
        </div>
        <ViewToggle view="table" />
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию, городу, адресу…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <datalist id="store-cities">
        {cities.map((c) => <option key={c} value={c} />)}
      </datalist>

      <GridTable columns={COLUMNS}>
        {filtered.map((s) => (
          <tr key={s.id} className="group">
            <GridCell sticky>
              <TextCell col="name" value={s.name} onSave={saver(s.id, 'name')} />
            </GridCell>
            <GridCell className="px-2 text-xs font-mono text-muted-foreground">
              {s.store_number != null ? String(s.store_number).padStart(3, '0') : ''}
            </GridCell>
            <GridCell>
              <TextCell col="city" value={s.city} onSave={saver(s.id, 'city')} list="store-cities" />
            </GridCell>
            <GridCell>
              <SelectCell col="chain" value={s.chain} onSave={saver(s.id, 'chain')} options={CHAIN_OPTIONS} />
            </GridCell>
            <GridCell className="px-2">
              <span className="block truncate text-muted-foreground" title={`${s.address}\nАдрес и точку на карте меняют в карточке магазина`}>
                {s.address}
              </span>
            </GridCell>
            <GridCell>
              <TextCell col="contact_phone" type="tel" value={s.contact_phone} onSave={saver(s.id, 'contact_phone')} />
            </GridCell>
            <GridCell>
              <TextCell col="contact_email" type="email" value={s.contact_email} onSave={saver(s.id, 'contact_email')} />
            </GridCell>
            <GridCell>
              <SelectCell
                col="manager_id"
                value={s.manager_id}
                onSave={saver(s.id, 'manager_id')}
                options={staffOptions(managers, users, s.manager_id)}
                emptyLabel="— Не назначен —"
              />
            </GridCell>
            <GridCell>
              <SelectCell
                col="tech_specialist_id"
                value={s.tech_specialist_id}
                onSave={saver(s.id, 'tech_specialist_id')}
                options={staffOptions(techSpecs, users, s.tech_specialist_id)}
                emptyLabel="— Не назначен —"
              />
            </GridCell>
            <GridCell>
              <Link
                href={`/stores/${s.id}`}
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
            <td colSpan={COLUMNS.length} className="text-center text-muted-foreground py-10">Магазины не найдены</td>
          </tr>
        )}
      </GridTable>
    </div>
  );
}
