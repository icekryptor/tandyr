import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@tandyr/shared';
import { ScreenHeader } from '../screen-header';

type SalaryRow = {
  id: string;
  week_number: number;
  week_year: number;
  period_start: string;
  period_end: string;
  shift_count: number;
  total_kg: number;
  accrual_kg: number;
  accrual_shift: number;
  total_accrual: number;
  fines_total: number;
  current_debt: number;
  transferred: number | null;
  debt_written_off: number | null;
  status: 'pending' | 'paid';
};

function netForPeriod(s: SalaryRow): number {
  return s.total_accrual - s.fines_total - s.current_debt + (s.debt_written_off ?? 0);
}

function payoutAmount(s: SalaryRow): number {
  return s.status === 'paid' ? (s.transferred ?? netForPeriod(s)) : netForPeriod(s);
}

function formatKgShort(kg: number): string {
  return `${kg.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`;
}

export default async function SalaryPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('weekly_salaries')
    .select(
      'id, week_number, week_year, period_start, period_end, shift_count, total_kg, accrual_kg, accrual_shift, total_accrual, fines_total, current_debt, transferred, debt_written_off, status',
    )
    .eq('user_id', user.id)
    .order('week_year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(20);

  const salaries = (data ?? []) as SalaryRow[];
  const latest = salaries[0];
  const history = salaries.slice(1);

  return (
    <div className="min-h-screen bg-background pb-10">
      <ScreenHeader title="Зарплата" subtitle="Ваш заработок по неделям" />

      <div className="px-6 pt-6 space-y-4">
        {salaries.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-4xl mb-2" aria-hidden>
              💰
            </p>
            <p className="text-base font-bold text-foreground">Пока нет начислений</p>
            <p className="text-sm text-muted-foreground mt-1">
              Закройте смены — управляющий рассчитает зарплату за неделю
            </p>
          </div>
        ) : (
          <>
            {latest && <LatestCard salary={latest} />}

            {history.length > 0 && (
              <>
                <h2 className="text-base font-bold text-foreground pt-2">История</h2>
                {history.map((s) => (
                  <HistoryRow key={s.id} salary={s} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SalaryRow['status'] }) {
  const isPaid = status === 'paid';
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
        isPaid ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
      }`}
    >
      {isPaid ? 'Выплачено' : 'Ожидает'}
    </span>
  );
}

function LatestCard({ salary: s }: { salary: SalaryRow }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">
            Неделя {s.week_number}, {s.week_year}
          </p>
          <p className="text-sm text-foreground mt-0.5">
            {formatDate(s.period_start)} — {formatDate(s.period_end)}
          </p>
        </div>
        <StatusBadge status={s.status} />
      </div>

      {/* Net total — hero */}
      <div className="bg-primary/5 rounded-xl p-4">
        <p className="text-xs text-muted-foreground font-medium">
          {s.status === 'paid' ? 'Выплачено' : 'К выплате'}
        </p>
        <p className="text-primary text-3xl font-extrabold mt-1">
          {formatCurrency(payoutAmount(s))}
        </p>
      </div>

      {/* Breakdown */}
      <div className="space-y-1">
        <BreakdownRow label="Смены" value={`${s.shift_count}`} sub={formatCurrency(s.accrual_shift)} />
        <BreakdownRow
          label="Произведено"
          value={formatKgShort(s.total_kg)}
          sub={formatCurrency(s.accrual_kg)}
        />
        <BreakdownRow label="Начислено" value={formatCurrency(s.total_accrual)} bold />
        {s.fines_total > 0 && (
          <BreakdownRow label="Штрафы" value={`− ${formatCurrency(s.fines_total)}`} negative />
        )}
        {s.current_debt > 0 && (
          <BreakdownRow label="Долг" value={`− ${formatCurrency(s.current_debt)}`} negative />
        )}
        {(s.debt_written_off ?? 0) > 0 && (
          <BreakdownRow
            label="Долг списан"
            value={`+ ${formatCurrency(s.debt_written_off ?? 0)}`}
            positive
          />
        )}
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  sub,
  bold,
  negative,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  bold?: boolean;
  negative?: boolean;
  positive?: boolean;
}) {
  const valueColor = negative ? 'text-destructive' : positive ? 'text-green-600' : 'text-foreground';
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-foreground/80 font-medium">{label}</span>
      <span className="text-right">
        <span className={`block text-sm ${bold ? 'font-bold' : 'font-semibold'} ${valueColor}`}>
          {value}
        </span>
        {sub && <span className="block text-xs text-muted-foreground mt-0.5">{sub}</span>}
      </span>
    </div>
  );
}

function HistoryRow({ salary: s }: { salary: SalaryRow }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">
          Неделя {s.week_number}, {s.week_year}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDate(s.period_start)} — {formatDate(s.period_end)} · {s.shift_count} см. ·{' '}
          {formatKgShort(s.total_kg)}
        </p>
      </div>
      <div className="text-right ml-3 shrink-0">
        <p className="text-base font-bold text-foreground">{formatCurrency(payoutAmount(s))}</p>
        <div className="mt-1">
          <StatusBadge status={s.status} />
        </div>
      </div>
    </div>
  );
}
