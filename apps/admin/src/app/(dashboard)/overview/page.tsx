export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users, Store, Calendar, TrendingUp, Wrench, AlertCircle,
  DollarSign, AlertTriangle,
} from 'lucide-react';
import { formatKg, formatCurrency } from '@tandyr/shared';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

const DEFAULT_CONSUMPTION: Record<string, number> = {
  flour: 25, sugar: 2, salt: 1, dry_milk: 10, yeast: 0.25, oil: 5,
};

function getResourceDays(resource: string, quantityKg: number, settings: Record<string, number>): number | null {
  const key = `${resource}_daily_consumption`;
  const consumption = settings[key] ?? DEFAULT_CONSUMPTION[resource];
  if (!consumption) return null;
  return quantityKg / consumption;
}

// SVG Bar Chart (server-rendered)
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const w = 40;
  const gap = 8;
  const chartH = 80;
  const total = data.length;
  const svgW = total * (w + gap) - gap;

  return (
    <svg viewBox={`0 0 ${svgW} ${chartH + 24}`} className="w-full h-auto" style={{ maxHeight: 120 }}>
      {data.map((d, i) => {
        const barH = Math.max(2, Math.round((d.value / maxVal) * chartH));
        const x = i * (w + gap);
        const y = chartH - barH;
        const isToday = i === total - 1;
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={w}
              height={barH}
              rx={4}
              fill={isToday ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.35)'}
            />
            {d.value > 0 && (
              <text x={x + w / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
                {Math.round(d.value)}
              </text>
            )}
            <text x={x + w / 2} y={chartH + 16} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: employeeCount },
    { count: storeCount },
    { count: openShifts },
    { count: pendingTechRequests },
    { data: recentShifts },
    { data: productionData },
    { data: settingsRows },
    { data: storesWithResources },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'employee').eq('is_active', true),
    supabase.from('stores').select('*', { count: 'exact', head: true }),
    supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('tech_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('shifts')
      .select('*, user:users(full_name), store:stores(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('shifts')
      .select('production_kg, created_at')
      .eq('status', 'closed')
      .not('production_kg', 'is', null)
      .gte('created_at', sevenDaysAgo),
    supabase.from('settings').select('key, value'),
    supabase.from('stores').select('id, name, resources:store_resources(resource, quantity_kg)'),
  ]);

  // Parse settings
  const settings: Record<string, number> = {};
  for (const row of settingsRows ?? []) {
    const n = parseFloat(row.value);
    if (!isNaN(n)) settings[row.key] = n;
  }

  const pricePerKg = settings.price_per_kg ?? 150;
  const shiftBaseRate = settings.shift_base_rate ?? 1500;
  const shiftKgRate = settings.shift_kg_rate ?? 300;

  // Weekly production total
  const weeklyProduction = (productionData ?? []).reduce(
    (sum: number, s: any) => sum + (s.production_kg ?? 0), 0,
  );

  // Revenue
  const weeklyRevenue = weeklyProduction * pricePerKg;

  // Salary fund: count shifts in last 7 days × base + kg bonus
  const weeklyShiftCount = productionData?.length ?? 0;
  const weeklyKgBonus = (weeklyProduction / 10) * shiftKgRate;
  const weeklySalary = weeklyShiftCount * shiftBaseRate + weeklyKgBonus;

  // Build chart: last 7 days
  const days = Array.from({ length: 7 }, (_, i) => subDays(startOfDay(new Date()), 6 - i));
  const chartData = days.map((day) => {
    const dayProd = (productionData ?? [])
      .filter((s: any) => isSameDay(new Date(s.created_at), day))
      .reduce((sum: number, s: any) => sum + (s.production_kg ?? 0), 0);
    return {
      label: format(day, 'EEE', { locale: ru }).slice(0, 2),
      value: dayProd,
    };
  });

  // Critical resources: days < 7
  const criticalStores: { storeId: string; storeName: string; resource: string; days: number }[] = [];
  for (const store of storesWithResources ?? []) {
    for (const res of (store as any).resources ?? []) {
      const d = getResourceDays(res.resource, res.quantity_kg ?? 0, settings);
      if (d !== null && d < 7) {
        criticalStores.push({
          storeId: store.id,
          storeName: store.name,
          resource: res.resource,
          days: Math.floor(d),
        });
      }
    }
  }

  const stats = [
    { title: 'Сотрудников', value: employeeCount ?? 0, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
    { title: 'Магазинов', value: storeCount ?? 0, icon: Store, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Открытых смен', value: openShifts ?? 0, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
    { title: 'Выработка 7д', value: formatKg(weeklyProduction), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    { title: 'Выручка 7д', value: formatCurrency(weeklyRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    {
      title: 'Техзаявок',
      value: pendingTechRequests ?? 0,
      icon: Wrench,
      color: pendingTechRequests ? 'text-destructive' : 'text-muted-foreground',
      bg: pendingTechRequests ? 'bg-destructive/10' : 'bg-muted',
    },
  ];

  const RESOURCE_LABELS: Record<string, string> = {
    flour: 'Мука', sugar: 'Сахар', salt: 'Соль',
    dry_milk: 'Сухое молоко', yeast: 'Дрожжи', oil: 'Масло',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Главная</h1>
        <p className="text-muted-foreground text-sm mt-1">Обзор работы сети пекарен</p>
      </div>

      {/* Critical resources alert */}
      {criticalStores.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                Критический уровень ресурсов ({criticalStores.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {criticalStores.slice(0, 8).map((c, i) => (
                  <Link
                    key={i}
                    href={`/stores/${c.storeId}`}
                    className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full hover:bg-red-200 transition-colors"
                  >
                    {c.storeName} · {RESOURCE_LABELS[c.resource] ?? c.resource} ~{c.days}д
                  </Link>
                ))}
                {criticalStores.length > 8 && (
                  <span className="text-xs text-red-500">+{criticalStores.length - 8} ещё</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(({ title, value, icon: Icon, color, bg }) => (
          <Card key={title} className="border-border shadow-none">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + salary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Production chart */}
        <Card className="border-border shadow-none lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Выработка по дням (кг)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            {weeklyProduction > 0 ? (
              <BarChart data={chartData} />
            ) : (
              <div className="h-20 flex items-center justify-center text-sm text-muted-foreground">
                Нет данных за последние 7 дней
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary fund */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Зарплатный фонд (7д)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(weeklySalary)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">оценочно за 7 дней</p>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Смены × {formatCurrency(shiftBaseRate)}</span>
                <span className="font-mono">{formatCurrency(weeklyShiftCount * shiftBaseRate)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Кг-бонус ({formatCurrency(shiftKgRate)}/10кг)</span>
                <span className="font-mono">{formatCurrency(weeklyKgBonus)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent shifts */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Последние смены</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(recentShifts ?? []).length === 0 ? (
              <div className="flex items-center gap-2 px-6 py-8 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Нет данных о сменах</span>
              </div>
            ) : (
              (recentShifts ?? []).map((shift: any) => (
                <div key={shift.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${shift.status === 'open' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{shift.user?.full_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{shift.store?.name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      shift.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-muted text-muted-foreground'
                    }`}>
                      {shift.status === 'open' ? 'Открыта' : 'Закрыта'}
                    </span>
                    {shift.production_kg && (
                      <p className="text-xs text-muted-foreground mt-0.5">{formatKg(shift.production_kg)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
