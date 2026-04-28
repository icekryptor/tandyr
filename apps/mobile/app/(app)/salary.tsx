import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import type { WeeklySalary } from '../../lib/shared/types';
import { formatCurrency, formatDate } from '../../lib/shared/utils';

function netForPeriod(s: WeeklySalary): number {
  return s.total_accrual - s.fines_total - s.current_debt + (s.debt_written_off ?? 0);
}

export default function SalaryScreen() {
  const { user } = useAuthStore();
  const [salaries, setSalaries] = useState<WeeklySalary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSalaries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('weekly_salaries')
      .select('*')
      .eq('user_id', user.id)
      .order('week_year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(20);
    setSalaries((data ?? []) as WeeklySalary[]);
  };

  useEffect(() => {
    fetchSalaries();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSalaries();
    setRefreshing(false);
  };

  const latest = salaries?.[0];
  const history = salaries?.slice(1) ?? [];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8564A" />}
    >
      {/* Header */}
      <View className="bg-primary pt-14 pb-6 px-6 rounded-b-3xl">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-white/80 text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
            ← Назад
          </Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl" style={{ fontFamily: 'Manrope_800ExtraBold' }}>
          Зарплата
        </Text>
        <Text className="text-white/80 text-sm mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
          Ваш заработок по неделям
        </Text>
      </View>

      <View className="px-6 pt-6 gap-4">
        {salaries === null ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#E8564A" />
          </View>
        ) : salaries.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 border border-border items-center">
            <Text className="text-4xl mb-2">💰</Text>
            <Text className="text-gray-900 text-base text-center" style={{ fontFamily: 'Manrope_700Bold' }}>
              Пока нет начислений
            </Text>
            <Text className="text-muted text-sm text-center mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
              Закройте смены — управляющий рассчитает зарплату за неделю
            </Text>
          </View>
        ) : (
          <>
            {latest && <LatestCard salary={latest} />}

            {history.length > 0 && (
              <>
                <Text
                  className="text-gray-900 text-base mt-2"
                  style={{ fontFamily: 'Manrope_700Bold' }}
                >
                  История
                </Text>
                {history.map((s) => (
                  <HistoryRow key={s.id} salary={s} />
                ))}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: WeeklySalary['status'] }) {
  const isPaid = status === 'paid';
  return (
    <View
      className={`px-2.5 py-1 rounded-full ${isPaid ? 'bg-green-50' : 'bg-orange-50'}`}
    >
      <Text
        className={`text-xs ${isPaid ? 'text-green-700' : 'text-orange-700'}`}
        style={{ fontFamily: 'Manrope_600SemiBold' }}
      >
        {isPaid ? 'Выплачено' : 'Ожидает'}
      </Text>
    </View>
  );
}

function LatestCard({ salary: s }: { salary: WeeklySalary }) {
  const net = netForPeriod(s);
  return (
    <View className="bg-white rounded-2xl p-5 shadow-sm border border-border gap-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-muted text-xs" style={{ fontFamily: 'Manrope_500Medium' }}>
            Неделя {s.week_number}, {s.week_year}
          </Text>
          <Text className="text-gray-900 text-sm mt-0.5" style={{ fontFamily: 'Manrope_400Regular' }}>
            {formatDate(s.period_start)} — {formatDate(s.period_end)}
          </Text>
        </View>
        <StatusBadge status={s.status} />
      </View>

      {/* Net total — hero */}
      <View className="bg-primary/5 rounded-xl p-4">
        <Text className="text-muted text-xs" style={{ fontFamily: 'Manrope_500Medium' }}>
          {s.status === 'paid' ? 'Получено' : 'К выплате'}
        </Text>
        <Text className="text-primary text-3xl mt-1" style={{ fontFamily: 'Manrope_800ExtraBold' }}>
          {formatCurrency(s.status === 'paid' ? (s.transferred ?? net) : net)}
        </Text>
      </View>

      {/* Breakdown grid */}
      <View className="gap-2">
        <BreakdownRow label="Смены" value={`${s.shift_count}`} sub={formatCurrency(s.accrual_shift)} />
        <BreakdownRow
          label="Произведено"
          value={`${s.total_kg.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`}
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
      </View>
    </View>
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
  const valueColor = negative ? 'text-destructive' : positive ? 'text-success' : 'text-gray-900';
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-gray-700 text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
        {label}
      </Text>
      <View className="items-end">
        <Text
          className={`text-sm ${valueColor}`}
          style={{ fontFamily: bold ? 'Manrope_700Bold' : 'Manrope_600SemiBold' }}
        >
          {value}
        </Text>
        {sub && (
          <Text className="text-muted text-xs mt-0.5" style={{ fontFamily: 'Manrope_400Regular' }}>
            {sub}
          </Text>
        )}
      </View>
    </View>
  );
}

function HistoryRow({ salary: s }: { salary: WeeklySalary }) {
  const amount = s.status === 'paid' ? (s.transferred ?? netForPeriod(s)) : netForPeriod(s);
  return (
    <View className="bg-white rounded-2xl p-4 border border-border flex-row items-center justify-between">
      <View className="flex-1">
        <Text className="text-gray-900 text-sm" style={{ fontFamily: 'Manrope_700Bold' }}>
          Неделя {s.week_number}, {s.week_year}
        </Text>
        <Text className="text-muted text-xs mt-0.5" style={{ fontFamily: 'Manrope_400Regular' }}>
          {formatDate(s.period_start)} — {formatDate(s.period_end)} · {s.shift_count} см. · {s.total_kg.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг
        </Text>
      </View>
      <View className="items-end ml-3">
        <Text className="text-gray-900 text-base" style={{ fontFamily: 'Manrope_700Bold' }}>
          {formatCurrency(amount)}
        </Text>
        <View className="mt-1">
          <StatusBadge status={s.status} />
        </View>
      </View>
    </View>
  );
}
