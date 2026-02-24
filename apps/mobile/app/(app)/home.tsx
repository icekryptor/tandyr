import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { useShiftStore } from '../../store/shift';
import { supabase } from '../../lib/supabase';
import type { Shift } from '../../lib/shared/types';
import { formatDateTime } from '../../lib/shared/utils';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { activeShift, setActiveShift } = useShiftStore();
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    fetchActiveShift();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActiveShift();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
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
            onPress={handleLogout}
            className="bg-white/20 rounded-xl px-3 py-2"
          >
            <Text className="text-white text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
              Выйти
            </Text>
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
