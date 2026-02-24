'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, MapPin } from 'lucide-react';
import { formatDateTime, formatKg } from '@tandyr/shared';
import type { Store } from '@tandyr/shared';

interface Shift {
  id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  production_kg: number | null;
  start_photo_url: string;
  end_photo_url: string | null;
  start_lat: number;
  start_lng: number;
  user: { full_name: string; email: string } | null;
  store: { name: string } | null;
}

export function ShiftsClient({
  shifts,
  stores,
}: {
  shifts: Shift[];
  stores: Pick<Store, 'id' | 'name'>[];
}) {
  const router = useRouter();
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
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
            <SelectItem value="open">Открыта</SelectItem>
            <SelectItem value="closed">Закрыта</SelectItem>
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
              <TableHead>Сотрудник</TableHead>
              <TableHead>Магазин</TableHead>
              <TableHead>Начало</TableHead>
              <TableHead>Конец</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Выработка</TableHead>
              <TableHead className="text-right">Детали</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Нет смен
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{shift.user?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{shift.user?.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">{shift.store?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(shift.start_time)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {shift.end_time ? formatDateTime(shift.end_time) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={shift.status === 'open' ? 'default' : 'secondary'}
                      className={shift.status === 'open' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                      {shift.status === 'open' ? 'Открыта' : 'Закрыта'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {shift.production_kg ? formatKg(shift.production_kg) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedShift(shift)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Shift detail dialog */}
      <Dialog open={!!selectedShift} onOpenChange={(open) => { if (!open) setSelectedShift(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали смены</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Сотрудник</p>
                  <p className="font-medium mt-0.5">{selectedShift.user?.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Магазин</p>
                  <p className="font-medium mt-0.5">{selectedShift.store?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Начало</p>
                  <p className="font-medium mt-0.5">{formatDateTime(selectedShift.start_time)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Конец</p>
                  <p className="font-medium mt-0.5">
                    {selectedShift.end_time ? formatDateTime(selectedShift.end_time) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Выработка</p>
                  <p className="font-medium mt-0.5">
                    {selectedShift.production_kg ? formatKg(selectedShift.production_kg) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">ID смены</p>
                  <p className="font-mono text-xs mt-0.5">{selectedShift.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3" />
                  Геолокация начала
                </p>
                <p className="text-xs font-mono bg-muted rounded px-2 py-1">
                  {selectedShift.start_lat.toFixed(6)}, {selectedShift.start_lng.toFixed(6)}
                </p>
              </div>

              {selectedShift.start_photo_url && (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Фото начала смены</p>
                  <img
                    src={selectedShift.start_photo_url}
                    alt="Начало смены"
                    className="w-full rounded-xl object-cover max-h-48"
                  />
                </div>
              )}

              {selectedShift.end_photo_url && (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Фото конца смены</p>
                  <img
                    src={selectedShift.end_photo_url}
                    alt="Конец смены"
                    className="w-full rounded-xl object-cover max-h-48"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
