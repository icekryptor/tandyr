import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import type { ChatRoom } from '../../lib/shared/types';
import { formatDateTime } from '../../lib/shared/utils';

export default function ChatsScreen() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('chat_members')
      .select('room_id, chat_rooms(*)')
      .eq('user_id', user.id);
    setRooms((data?.map((d: any) => d.chat_rooms) ?? []) as ChatRoom[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary pt-14 pb-6 px-6 rounded-b-3xl">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-white/80 text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
            ← Назад
          </Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl" style={{ fontFamily: 'Manrope_800ExtraBold' }}>
          Чаты
        </Text>
        <Text className="text-white/80 text-sm mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
          Общение с руководством
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E8564A" />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8564A" />
          }
          ListEmptyComponent={
            <View className="items-center justify-center pt-20">
              <Text className="text-4xl mb-4">💬</Text>
              <Text className="text-gray-700 text-base" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                Нет активных чатов
              </Text>
              <Text className="text-muted text-sm mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
                Администратор добавит вас в чат
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-white rounded-2xl p-4 border border-border flex-row items-center gap-3"
              onPress={() => router.push(`/(app)/chat/${item.id}`)}
              activeOpacity={0.8}
            >
              <View className="w-12 h-12 rounded-2xl bg-accent/10 items-center justify-center">
                <Text className="text-xl">{item.type === 'group' ? '👥' : '💬'}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 text-base" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                  {item.name}
                </Text>
                <Text className="text-muted text-xs mt-0.5" style={{ fontFamily: 'Manrope_400Regular' }}>
                  {item.type === 'group' ? 'Групповой чат' : 'Личный чат'}
                </Text>
              </View>
              <Text className="text-gray-400">›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
