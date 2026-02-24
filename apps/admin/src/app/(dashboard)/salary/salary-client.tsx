'use client';

import { useState, useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calculator, CheckCircle, Download } from 'lucide-react';
import { calculateSalary, markSalaryPaid } from './actions';
import { formatKg, formatCurrency, formatDate } from '@tandyr/shared';
import type { SalaryRecord } from '@tandyr/shared';

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

export function SalaryClient({
  records,
  employees,
}: {
  records: (SalaryRecord & { user: { full_name: string; email: string } | null })[];
  employees: Employee[];
}) {
  const [calcOpen, setCalcOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<{ total_kg: number; total_amount: number } | null>(null);

  const handleCalculate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setCalcResult(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await calculateSalary(fd);
      if (result?.error) {
        setError(result.error);
      } else if (result?.total_kg !== undefined) {
        setCalcResult({ total_kg: result.total_kg, total_amount: result.total_amount! });
        setCalcOpen(false);
      }
    });
  };

  const handleMarkPaid = (id: string) => {
    startTransition(async () => { await markSalaryPaid(id); });
  };

  const exportCSV = () => {
    const rows = [
      ['Сотрудник', 'Email', 'Период', 'Выработка (кг)', 'Ставка (₸/кг)', 'Сумма (₸)', 'Статус'],
      ...records.map((r) => [
        r.user?.full_name ?? '',
        r.user?.email ?? '',
        `${formatDate(r.period_start)} — ${formatDate(r.period_end)}`,
        r.total_kg.toString(),
        r.rate_per_kg.toString(),
        r.total_amount.toString(),
        r.status === 'paid' ? 'Выплачено' : 'Рассчитано',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Зарплата</h1>
          <p className="text-muted-foreground text-sm mt-1">{records.length} записей</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
            <DialogTrigger asChild>
              <Button>
                <Calculator className="h-4 w-4 mr-2" />
                Рассчитать
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Расчёт зарплаты</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCalculate} className="space-y-4 mt-2">
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Период с</Label>
                    <Input type="date" name="period_start" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Период по</Label>
                    <Input type="date" name="period_end" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Ставка (₸ за кг)</Label>
                  <Input type="number" name="rate_per_kg" step="any" min="0" required placeholder="500" />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Расчёт...' : 'Рассчитать зарплату'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Сотрудник</TableHead>
              <TableHead>Период</TableHead>
              <TableHead>Выработка</TableHead>
              <TableHead>Ставка</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Нет записей. Нажмите «Рассчитать» для создания.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{record.user?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{record.user?.email}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(record.period_start)} — {formatDate(record.period_end)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{formatKg(record.total_kg)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.rate_per_kg.toLocaleString('ru-RU')} ₸/кг
                  </TableCell>
                  <TableCell className="text-sm font-bold text-foreground">
                    {record.total_amount.toLocaleString('ru-RU')} ₸
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={record.status === 'paid'
                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'}
                    >
                      {record.status === 'paid' ? 'Выплачено' : 'Рассчитано'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {record.status === 'calculated' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-green-600"
                        onClick={() => handleMarkPaid(record.id)}
                        disabled={isPending}
                        title="Отметить как выплачено"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
