import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/auth';
import type { Message } from '../../../lib/shared/types';
import { formatDateTime } from '../../../lib/shared/utils';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomName, setRoomName] = useState('Чат');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const [roomRes, messagesRes] = await Promise.all([
        supabase.from('chat_rooms').select('name').eq('id', id).single(),
        supabase
          .from('messages')
          .select('*, user:users(id, full_name)')
          .eq('room_id', id)
          .order('created_at', { ascending: true }),
      ]);
      if (roomRes.data) setRoomName(roomRes.data.name);
      setMessages((messagesRes.data ?? []) as Message[]);
      setLoading(false);
    };
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel(`room:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${id}` },
        async (payload) => {
          const { data: newMsg } = await supabase
            .from('messages')
            .select('*, user:users(id, full_name)')
            .eq('id', payload.new.id)
            .single();
          if (newMsg) {
            setMessages((prev) => [...prev, newMsg as Message]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !user || !id) return;
    setSending(true);
    await supabase.from('messages').insert({
      room_id: id,
      user_id: user.id,
      content: text.trim(),
    });
    setText('');
    setSending(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View className="bg-primary pt-14 pb-4 px-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <Text className="text-white/80 text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
            ← Назад
          </Text>
        </TouchableOpacity>
        <Text className="text-white text-lg" style={{ fontFamily: 'Manrope_700Bold' }}>
          {roomName}
        </Text>
      </View>

      {/* Messages */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E8564A" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 8 }}
          ListEmptyComponent={
            <View className="items-center justify-center pt-20">
              <Text className="text-4xl mb-2">👋</Text>
              <Text className="text-muted text-sm" style={{ fontFamily: 'Manrope_400Regular' }}>
                Напишите первое сообщение
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOwn = item.user_id === user?.id;
            return (
              <View className={`max-w-[80%] ${isOwn ? 'self-end' : 'self-start'}`}>
                {!isOwn && (
                  <Text className="text-muted text-xs mb-1 ml-1" style={{ fontFamily: 'Manrope_500Medium' }}>
                    {(item as any).user?.full_name ?? 'Пользователь'}
                  </Text>
                )}
                <View
                  className={`rounded-2xl px-4 py-2.5 ${
                    isOwn ? 'bg-primary rounded-tr-sm' : 'bg-white border border-border rounded-tl-sm'
                  }`}
                >
                  <Text
                    className={`text-sm ${isOwn ? 'text-white' : 'text-gray-900'}`}
                    style={{ fontFamily: 'Manrope_400Regular' }}
                  >
                    {item.content}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-muted'}`}
                    style={{ fontFamily: 'Manrope_400Regular' }}
                  >
                    {formatDateTime(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Input */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-t border-border">
        <TextInput
          className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-gray-900 text-sm"
          style={{ fontFamily: 'Manrope_400Regular', maxHeight: 100 }}
          placeholder="Написать сообщение..."
          placeholderTextColor="#9CA3AF"
          multiline
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity
          className={`w-10 h-10 rounded-xl items-center justify-center ${
            !text.trim() || sending ? 'bg-primary/40' : 'bg-primary'
          }`}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-base">↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
