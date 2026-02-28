'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calculator, ChevronLeft, ChevronRight, Pencil,
  CheckCircle, FileSpreadsheet, User,
} from 'lucide-react';
import { calculateWeeklySalary, updateSalaryPayment } from './actions';
import { formatDate, pluralize } from '@tandyr/shared';
import type { WeeklySalary } from '@tandyr/shared';

type RecordWithUser = WeeklySalary & {
  user: { id: string; full_name: string; email: string } | null;
};

interface Props {
  records: RecordWithUser[];
  employees: { id: string; full_name: string; email: string }[];
  currentWeek: number;
  currentYear: number;
}

function fmt(v: number | null | undefined, fallback = '—') {
  if (v == null) return fallback;
  return `${v.toLocaleString('ru-RU')} ₽`;
}

// ─── Week arithmetic helpers ───────────────────────────────────────────────────
function shiftWeek(week: number, year: number, delta: number) {
  let w = week + delta;
  let y = year;
  while (w < 1)  { y--; w += 52; }
  while (w > 52) { y++; w -= 52; }
  return { week: w, year: y };
}

function weekLabel(week: number, year: number, todayWeek: number, todayYear: number) {
  if (week === todayWeek && year === todayYear) return 'Текущая';
  const diff = (year - todayYear) * 52 + (week - todayWeek);
  if (diff === -1) return '1 нед. назад';
  if (diff === -2) return '2 нед. назад';
  if (diff ===  1) return '1 нед. вперёд';
  if (diff ===  2) return '2 нед. вперёд';
  return `Нед. ${week}`;
}

// ─── 5-Week Strip Navigator ────────────────────────────────────────────────────
function WeekStrip({
  currentWeek, currentYear, todayWeek, todayYear, onNavigate,
}: {
  currentWeek: number; currentYear: number;
  todayWeek: number; todayYear: number;
  onNavigate: (week: number, year: number) => void;
}) {
  // Build 5 pills: [current-2, current-1, current, current+1, current+2]
  const pills = [-2, -1, 0, 1, 2].map((d) => shiftWeek(currentWeek, currentYear, d));
  const prev = shiftWeek(currentWeek, currentYear, -1);
  const next = shiftWeek(currentWeek, currentYear, +1);

  return (
    <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-1.5 w-fit flex-wrap">
      {/* ← arrow */}
      <button
        onClick={() => onNavigate(prev.week, prev.year)}
        className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        title="Предыдущая неделя"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* 5 week pills */}
      {pills.map(({ week, year }) => {
        const isSelected = week === currentWeek && year === currentYear;
        const isToday = week === todayWeek && year === todayYear;
        return (
          <button
            key={`${week}-${year}`}
            onClick={() => onNavigate(week, year)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : isToday
                  ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            <span className="block">{weekLabel(week, year, todayWeek, todayYear)}</span>
            <span className="block text-[10px] opacity-70">Нед. {week}, {year}</span>
          </button>
        );
      })}

      {/* → arrow */}
      <button
        onClick={() => onNavigate(next.week, next.year)}
        className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        title="Следующая неделя"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Salary Card (expandable row detail) ─────────────────────────────────────
function SalaryCard({ record, onUpdate }: { record: RecordWithUser; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const net = record.total_accrual - record.fines_total;

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateSalaryPayment(record.id, fd);
      if (res?.error) setError(res.error);
      else { setOpen(false); onUpdate(); }
    });
  };

  return (
    <>
      {/* Table row */}
      <TableRow className="cursor-pointer hover:bg-muted/30" onClick={() => setOpen(true)}>
        <TableCell>
          {record.user ? (
            <Link href={`/employees/${record.user.id}`} className="font-medium text-sm hover:underline text-primary" onClick={e => e.stopPropagation()}>
              {record.user.full_name}
            </Link>
          ) : '—'}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDate(record.period_start)} — {formatDate(record.period_end)}
        </TableCell>
        <TableCell className="text-sm">{record.shift_count}</TableCell>
        <TableCell className="text-sm">{record.total_kg} кг</TableCell>
        <TableCell className="text-sm font-medium">{fmt(record.total_accrual)}</TableCell>
        <TableCell className="text-sm text-red-600">{record.fines_total > 0 ? fmt(record.fines_total) : '—'}</TableCell>
        <TableCell className="text-sm font-semibold text-blue-700">{fmt(record.transferred)}</TableCell>
        <TableCell>
          <Badge className={
            record.status === 'paid'
              ? 'bg-green-100 text-green-700 hover:bg-green-100'
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
          }>
            {record.status === 'paid' ? 'Оплачено' : 'Не оплачено'}
          </Badge>
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Detail dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {record.user?.full_name ?? '—'} — Неделя {record.week_number}/{record.week_year}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoBox label="Период" value={`${formatDate(record.period_start)} — ${formatDate(record.period_end)}`} />
              <InfoBox label="Неделя" value={`№${record.week_number} / ${record.week_year}`} />
              <InfoBox label="Смен отработано" value={String(record.shift_count)} />
              <InfoBox label="Выработка" value={`${record.total_kg} кг`} />
              <InfoBox label="Начислено за кг" value={`${record.total_kg} × 30 = ${fmt(record.accrual_kg)}`} />
              <InfoBox label="Начислено за выход" value={`${record.shift_count} × 1 500 = ${fmt(record.accrual_shift)}`} />
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-center">
                <p className="text-[10px] text-green-700 mb-1">Начислено</p>
                <p className="text-lg font-bold text-green-700">{fmt(record.total_accrual)}</p>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                <p className="text-[10px] text-red-700 mb-1">Штрафы</p>
                <p className="text-lg font-bold text-red-700">{record.fines_total > 0 ? fmt(record.fines_total) : '—'}</p>
              </div>
              <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
                <p className="text-[10px] text-orange-700 mb-1">Текущий долг</p>
                <p className="text-lg font-bold text-orange-700">{fmt(record.current_debt)}</p>
              </div>
            </div>

            {/* Editable fields */}
            <form onSubmit={handleSave} className="space-y-4 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Перечислено (₽)</Label>
                  <Input name="transferred" type="number" step="0.01" min="0" defaultValue={record.transferred ?? ''} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Списано долга (₽)</Label>
                  <Input name="debt_written_off" type="number" step="0.01" min="0" defaultValue={record.debt_written_off ?? ''} placeholder="0" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Статус перевода</Label>
                <Select name="status" defaultValue={record.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Не оплачено</SelectItem>
                    <SelectItem value="paid">Оплачено</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Net summary */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-center justify-between">
                <p className="text-xs text-blue-700">К перечислению</p>
                <p className="text-base font-bold text-blue-700">
                  {fmt(net - (record.transferred ?? 0) - (record.debt_written_off ?? 0))}
                </p>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-2.5">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="font-medium text-xs">{value}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SalaryClient({ records, employees, currentWeek, currentYear }: Props) {
  const router = useRouter();
  const [calcOpen, setCalcOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Today's ISO week (for "Текущая" highlight)
  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay() || 7;
  const thursday = new Date(todayDate);
  thursday.setDate(todayDate.getDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(thursday.getFullYear(), 0, 1));
  const todayWeek = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const todayYear = thursday.getFullYear();

  const handleNavigate = (week: number, year: number) => {
    router.push(`/salary?week=${week}&year=${year}`);
  };

  const handleCalculate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set('week_number', String(currentWeek));
    fd.set('week_year', String(currentYear));
    startTransition(async () => {
      const res = await calculateWeeklySalary(fd);
      if (res?.error) setError(res.error);
      else {
        setCalcOpen(false);
        router.refresh();
      }
    });
  };

  const exportXLS = async () => {
    // Dynamically import xlsx to keep bundle size small
    const XLSX = await import('xlsx');

    const rows: (string | number)[][] = [
      ['ФИО', 'Период', 'Неделя', 'Смен', 'Выработка (кг)', 'Начислено (₽)', 'Штрафы (₽)', 'Перечислено (₽)', 'Статус'],
      ...records.map((r) => [
        r.user?.full_name ?? '',
        `${formatDate(r.period_start)} — ${formatDate(r.period_end)}`,
        `${r.week_number}/${r.week_year}`,
        r.shift_count,
        r.total_kg,
        r.total_accrual,
        r.fines_total,
        r.transferred ?? 0,
        r.status === 'paid' ? 'Оплачено' : 'Не оплачено',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Auto-width columns
    const colWidths = rows[0].map((_, ci) =>
      Math.max(...rows.map((row) => String(row[ci] ?? '').length), 10)
    );
    ws['!cols'] = colWidths.map((w) => ({ wch: Math.min(w + 2, 40) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Нед_${currentWeek}_${currentYear}`);
    XLSX.writeFile(wb, `salary_tandyr_w${currentWeek}_${currentYear}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Зарплата</h1>
          <p className="text-muted-foreground text-sm mt-1">{records.length} {pluralize(records.length, 'запись', 'записи', 'записей')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportXLS} disabled={records.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Экспорт XLS
          </Button>
          <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
            <DialogTrigger asChild>
              <Button>
                <Calculator className="h-4 w-4 mr-2" />
                Рассчитать неделю
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Расчёт зарплаты — Неделя {currentWeek}/{currentYear}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCalculate} className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Ставки: <strong>30 ₽/кг</strong> + <strong>1 500 ₽ за выход</strong>
                </p>
                <div className="space-y-1.5">
                  <Label>Сотрудник</Label>
                  <Select name="user_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите сотрудника" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Расчёт...' : `Рассчитать за нед. ${currentWeek}`}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 5-week strip navigator */}
      <div className="mb-5 overflow-x-auto pb-1">
        <WeekStrip
          currentWeek={currentWeek}
          currentYear={currentYear}
          todayWeek={todayWeek}
          todayYear={todayYear}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Summary bar */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Начислено', value: records.reduce((s, r) => s + r.total_accrual, 0), color: 'text-green-700 bg-green-50 border-green-100' },
            { label: 'Штрафы', value: records.reduce((s, r) => s + r.fines_total, 0), color: 'text-red-700 bg-red-50 border-red-100' },
            { label: 'Перечислено', value: records.reduce((s, r) => s + (r.transferred ?? 0), 0), color: 'text-blue-700 bg-blue-50 border-blue-100' },
            { label: 'Оплачено', value: records.filter(r => r.status === 'paid').length, suffix: ' чел.', color: 'text-purple-700 bg-purple-50 border-purple-100' },
          ].map(({ label, value, color, suffix }) => (
            <div key={label} className={`rounded-xl border p-3 ${color}`}>
              <p className="text-[10px] mb-1 opacity-70">{label}</p>
              <p className="text-lg font-bold">{typeof value === 'number' && !suffix ? `${value.toLocaleString('ru-RU')} ₽` : `${value}${suffix ?? ''}`}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Сотрудник</TableHead>
              <TableHead>Период</TableHead>
              <TableHead>Смен</TableHead>
              <TableHead>Выработка</TableHead>
              <TableHead>Начислено</TableHead>
              <TableHead>Штраф</TableHead>
              <TableHead>Перечислено</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  <div className="space-y-2">
                    <CheckCircle className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p>Нет записей за неделю {currentWeek}</p>
                    <p className="text-xs">Нажмите «Рассчитать неделю» для создания записей</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <SalaryCard
                  key={record.id}
                  record={record}
                  onUpdate={() => router.refresh()}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
