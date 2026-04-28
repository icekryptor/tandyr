import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { useShiftStore } from '../../store/shift';
import { supabase } from '../../lib/supabase';
import type { Shift } from '../../lib/shared/types';
import { formatDateTime } from '../../lib/shared/utils';

type PendingAct = { id: string; scheduled_date: string; week_number: number; week_year: number };

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { activeShift, setActiveShift } = useShiftStore();
  const [refreshing, setRefreshing] = useState(false);
  const [pendingAct, setPendingAct] = useState<PendingAct | null>(null);

  const fetchActiveShift = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('shifts')
      .select('*, store:stores(name, address)')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setActiveShift(data as Shift | null);
  };

  const fetchPendingAct = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('inventory_acts')
      .select('id, scheduled_date, week_number, week_year')
      .eq('user_id', user.id)
      .in('status', ['pending', 'overdue'])
      .order('scheduled_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    setPendingAct(data ?? null);
  };

  useEffect(() => {
    fetchActiveShift();
    fetchPendingAct();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchActiveShift(), fetchPendingAct()]);
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 17) return 'Добрый день';
    return 'Добрый вечер';
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8564A" />}
    >
      {/* Header */}
      <View className="bg-primary pt-14 pb-6 px-6 rounded-b-3xl">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white/80 text-sm" style={{ fontFamily: 'Manrope_400Regular' }}>
              {greeting()},
            </Text>
            <Text className="text-white text-xl" style={{ fontFamily: 'Manrope_700Bold' }}>
              {user?.full_name?.split(' ')[0] ?? 'Сотрудник'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/profile')}
            className="w-11 h-11 rounded-full bg-white/20 items-center justify-center overflow-hidden"
            activeOpacity={0.8}
          >
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={{ width: 44, height: 44 }}
                resizeMode="cover"
              />
            ) : (
              <Text className="text-white" style={{ fontFamily: 'Manrope_700Bold' }}>
                {(user?.full_name ?? '?')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join('')
                  .toUpperCase() || '?'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-6 pt-6 gap-4">
        {/* Active shift card */}
        {activeShift ? (
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-border">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-2.5 h-2.5 rounded-full bg-success" />
              <Text className="text-success text-sm" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                Смена открыта
              </Text>
            </View>
            <Text className="text-gray-900 text-lg" style={{ fontFamily: 'Manrope_700Bold' }}>
              {(activeShift as any).store?.name ?? 'Магазин'}
            </Text>
            <Text className="text-muted text-sm mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
              {(activeShift as any).store?.address}
            </Text>
            <Text className="text-muted text-xs mt-2" style={{ fontFamily: 'Manrope_400Regular' }}>
              Начало: {formatDateTime(activeShift.start_time)}
            </Text>

            <TouchableOpacity
              className="mt-4 bg-primary rounded-xl py-3.5 items-center"
              onPress={() => router.push('/(app)/end-shift')}
              activeOpacity={0.8}
            >
              <Text className="text-white" style={{ fontFamily: 'Manrope_700Bold' }}>
                Завершить смену
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-border">
            <Text className="text-gray-900 text-lg mb-1" style={{ fontFamily: 'Manrope_700Bold' }}>
              Нет активной смены
            </Text>
            <Text className="text-muted text-sm mb-4" style={{ fontFamily: 'Manrope_400Regular' }}>
              Сфотографируйте рабочее место для начала смены
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-xl py-3.5 items-center"
              onPress={() => router.push('/(app)/start-shift')}
              activeOpacity={0.8}
            >
              <Text className="text-white" style={{ fontFamily: 'Manrope_700Bold' }}>
                Начать смену
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Inventory act banner */}
        {pendingAct && (
          <TouchableOpacity
            className="bg-orange-50 border border-orange-200 rounded-2xl p-4"
            onPress={() => router.push({ pathname: '/(app)/inventory-act', params: { actId: pendingAct.id } })}
            activeOpacity={0.8}
          >
            <View className="flex-row items-start gap-3">
              <Text className="text-2xl">📋</Text>
              <View className="flex-1">
                <Text className="text-orange-700 text-sm" style={{ fontFamily: 'Manrope_700Bold' }}>
                  Проведите инвентаризацию
                </Text>
                <Text className="text-orange-600 text-xs mt-0.5" style={{ fontFamily: 'Manrope_400Regular' }}>
                  Неделя {pendingAct.week_number}, {pendingAct.week_year} · Нажмите для заполнения
                </Text>
              </View>
              <Text className="text-orange-400 text-lg">→</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Action buttons */}
        <Text className="text-gray-900 text-base mt-2" style={{ fontFamily: 'Manrope_700Bold' }}>
          Действия
        </Text>

        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-white rounded-2xl p-4 border border-border items-center gap-2"
            onPress={() => router.push('/(app)/chats')}
            activeOpacity={0.8}
          >
            <View className="w-12 h-12 rounded-2xl bg-accent/10 items-center justify-center">
              <Text className="text-2xl">💬</Text>
            </View>
            <Text className="text-gray-900 text-sm text-center" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              Чаты
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-white rounded-2xl p-4 border border-border items-center gap-2"
            onPress={() => {
              if (!activeShift) {
                Alert.alert('Нет активной смены', 'Сначала начните смену');
                return;
              }
              router.push('/(app)/tech-request');
            }}
            activeOpacity={0.8}
          >
            <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
              <Text className="text-2xl">🔧</Text>
            </View>
            <Text className="text-gray-900 text-sm text-center" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              Техзаявка
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-white rounded-2xl p-4 border border-border items-center gap-2"
            onPress={() => {
              if (!activeShift) {
                Alert.alert('Нет активной смены', 'Сначала начните смену');
                return;
              }
              router.push('/(app)/progress');
            }}
            activeOpacity={0.8}
          >
            <View className="w-12 h-12 rounded-2xl bg-success/10 items-center justify-center">
              <Text className="text-2xl">📊</Text>
            </View>
            <Text className="text-gray-900 text-sm text-center" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              Прогресс
            </Text>
          </TouchableOpacity>
        </View>

        {/* Salary row */}
        <TouchableOpacity
          className="bg-white rounded-2xl p-4 border border-border flex-row items-center gap-3"
          onPress={() => router.push('/(app)/salary')}
          activeOpacity={0.8}
        >
          <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
            <Text className="text-2xl">💰</Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 text-base" style={{ fontFamily: 'Manrope_700Bold' }}>
              Моя зарплата
            </Text>
            <Text className="text-muted text-xs mt-0.5" style={{ fontFamily: 'Manrope_400Regular' }}>
              Заработок по неделям и история выплат
            </Text>
          </View>
          <Text className="text-muted text-lg">→</Text>
        </TouchableOpacity>

        {/* Shift ID info */}
        {activeShift && (
          <View className="bg-gray-50 rounded-xl p-4 border border-border">
            <Text className="text-muted text-xs" style={{ fontFamily: 'Manrope_400Regular' }}>
              ID смены
            </Text>
            <Text className="text-gray-700 text-sm font-mono mt-0.5" style={{ fontFamily: 'Manrope_500Medium' }}>
              {activeShift.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
