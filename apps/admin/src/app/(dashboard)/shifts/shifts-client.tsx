'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatKg, SHIFT_STATUS_LABELS } from '@tandyr/shared';
import type { Shift, Store } from '@tandyr/shared';

type ShiftRow = Shift & {
  user: { id: string; full_name: string; email: string } | null;
  store: { id: string; name: string } | null;
};

export function ShiftsClient({
  shifts,
  stores,
}: {
  shifts: ShiftRow[];
  stores: Pick<Store, 'id' | 'name'>[];
}) {
  const router = useRouter();
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (storeFilter !== 'all') params.set('store', storeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (dateFilter) params.set('date', dateFilter);
    router.push(`/shifts?${params.toString()}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Смены</h1>
        <p className="text-muted-foreground text-sm mt-1">{shifts.length} записей</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Магазин" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все магазины</SelectItem>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(SHIFT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-40"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />

        <Button onClick={handleFilter} variant="secondary">Применить</Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-16">№</TableHead>
              <TableHead>Сотрудник</TableHead>
              <TableHead>Магазин</TableHead>
              <TableHead>Открытие</TableHead>
              <TableHead>Закрытие</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Выработка</TableHead>
              <TableHead>К перечислению</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Нет смен
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => {
                const net = (shift.accrual ?? 0) - (shift.fine ?? 0);
                const hasFinance = shift.accrual != null || shift.fine != null;
                return (
                  <TableRow key={shift.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell>
                      <Link href={`/shifts/${shift.id}`} className="block font-mono text-xs text-muted-foreground">
                        #{shift.shift_number ?? shift.id.slice(0, 4).toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/shifts/${shift.id}`} className="block">
                        <p className="font-medium text-sm">{shift.user?.full_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{shift.user?.email}</p>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Link href={`/shifts/${shift.id}`} className="block">
                        {shift.store?.name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <Link href={`/shifts/${shift.id}`} className="block">
                        {formatDateTime(shift.start_time)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <Link href={`/shifts/${shift.id}`} className="block">
                        {shift.end_time ? formatDateTime(shift.end_time) : '—'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/shifts/${shift.id}`} className="block">
                        <Badge
                          className={
                            shift.status === 'open'
                              ? 'bg-green-100 text-green-700 hover:bg-green-100'
                              : 'bg-muted text-muted-foreground hover:bg-muted'
                          }
                        >
                          {SHIFT_STATUS_LABELS[shift.status] ?? shift.status}
                        </Badge>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Link href={`/shifts/${shift.id}`} className="block">
                        {shift.production_kg ? formatKg(shift.production_kg) : '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Link href={`/shifts/${shift.id}`} className="block">
                        {hasFinance ? (
                          <span className={net >= 0 ? 'text-blue-700 font-medium' : 'text-orange-600 font-medium'}>
                            {net.toLocaleString('ru-RU')} ₽
                          </span>
                        ) : '—'}
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
