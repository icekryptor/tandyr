export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Store, Calendar, TrendingUp, Wrench, AlertCircle } from 'lucide-react';
import { formatKg, formatCurrency } from '@tandyr/shared';

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: employeeCount },
    { count: storeCount },
    { count: openShifts },
    { count: pendingTechRequests },
    { data: recentShifts },
    { data: productionData },
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
      .select('production_kg')
      .eq('status', 'closed')
      .not('production_kg', 'is', null)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const weeklyProduction = (productionData ?? []).reduce(
    (sum: number, s: any) => sum + (s.production_kg ?? 0),
    0,
  );

  const stats = [
    {
      title: 'Сотрудников',
      value: employeeCount ?? 0,
      icon: Users,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      title: 'Магазинов',
      value: storeCount ?? 0,
      icon: Store,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Открытых смен',
      value: openShifts ?? 0,
      icon: Calendar,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Выработка (7 дней)',
      value: formatKg(weeklyProduction),
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Техзаявок (ожидает)',
      value: pendingTechRequests ?? 0,
      icon: Wrench,
      color: pendingTechRequests ? 'text-destructive' : 'text-muted-foreground',
      bg: pendingTechRequests ? 'bg-destructive/10' : 'bg-muted',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Главная</h1>
        <p className="text-muted-foreground text-sm mt-1">Обзор работы сети пекарен</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
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
                      shift.status === 'open'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
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
