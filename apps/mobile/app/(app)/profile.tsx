import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const { user, setUser } = useAuthStore();

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeAddress, setStoreAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.store_id) {
      setStoreName(null);
      setStoreAddress(null);
      return;
    }
    supabase
      .from('stores')
      .select('name, address')
      .eq('id', user.store_id)
      .single()
      .then(({ data }) => {
        setStoreName(data?.name ?? null);
        setStoreAddress(data?.address ?? null);
      });
  }, [user?.store_id]);

  const initials = (user?.full_name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  const phoneChanged = (user?.phone ?? '') !== phone.trim();

  const refreshUser = async () => {
    if (!user) return;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (data) setUser(data);
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к фото в настройках');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
      exif: false,
    });
    if (result.canceled || !result.assets[0] || !user) return;

    setAvatarUploading(true);
    try {
      const uri = result.assets[0].uri;
      const fileName = `avatars/${user.id}/${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl.publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      await refreshUser();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось загрузить фото';
      Alert.alert('Ошибка', msg);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSavePhone = async () => {
    if (!user) return;
    const trimmed = phone.trim();
    setPhoneSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ phone: trimmed.length === 0 ? null : trimmed })
        .eq('id', user.id);
      if (error) throw error;
      await refreshUser();
      Alert.alert('Сохранено', 'Телефон обновлён');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось сохранить';
      Alert.alert('Ошибка', msg);
    } finally {
      setPhoneSaving(false);
    }
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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="bg-primary pt-14 pb-6 px-6 rounded-b-3xl">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-white/80 text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
              ← Назад
            </Text>
          </TouchableOpacity>
          <Text className="text-white text-2xl" style={{ fontFamily: 'Manrope_800ExtraBold' }}>
            Профиль
          </Text>
        </View>

        <View className="px-6 pt-6 gap-5">
          {/* Avatar */}
          <View className="items-center">
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85}>
              <View className="w-28 h-28 rounded-full bg-primary/10 items-center justify-center overflow-hidden border-2 border-primary/20">
                {user?.avatar_url ? (
                  <Image
                    source={{ uri: user.avatar_url }}
                    style={{ width: 112, height: 112 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    className="text-primary text-3xl"
                    style={{ fontFamily: 'Manrope_800ExtraBold' }}
                  >
                    {initials}
                  </Text>
                )}
              </View>
              {avatarUploading && (
                <View
                  className="absolute inset-0 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
                >
                  <ActivityIndicator color="#E8564A" />
                </View>
              )}
            </TouchableOpacity>
            <Text
              className="text-muted text-xs mt-3"
              style={{ fontFamily: 'Manrope_500Medium' }}
            >
              Нажмите, чтобы изменить
            </Text>
          </View>

          {/* Identity */}
          <View className="bg-white rounded-2xl p-5 border border-border gap-3">
            <Field label="Имя" value={user?.full_name ?? '—'} />
            <Field label="Email" value={user?.email ?? '—'} />
            {storeName && <Field label="Магазин" value={storeName} sub={storeAddress ?? undefined} />}
          </View>

          {/* Editable phone */}
          <View className="bg-white rounded-2xl p-5 border border-border gap-2">
            <Text className="text-gray-700 text-sm" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              Телефон
            </Text>
            <TextInput
              className="bg-background border border-border rounded-xl px-4 py-3 text-gray-900 text-base"
              style={{ fontFamily: 'Manrope_500Medium' }}
              placeholder="+7 (___) ___-__-__"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCorrect={false}
            />
            {phoneChanged && (
              <TouchableOpacity
                className={`rounded-xl py-3 items-center mt-1 ${
                  phoneSaving ? 'bg-primary/40' : 'bg-primary'
                }`}
                onPress={handleSavePhone}
                disabled={phoneSaving}
                activeOpacity={0.8}
              >
                {phoneSaving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-sm" style={{ fontFamily: 'Manrope_700Bold' }}>
                    Сохранить
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity
            className="bg-white rounded-2xl p-4 border border-border flex-row items-center gap-3"
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View className="w-10 h-10 rounded-2xl bg-destructive/10 items-center justify-center">
              <Text className="text-xl">🚪</Text>
            </View>
            <Text
              className="text-destructive text-base flex-1"
              style={{ fontFamily: 'Manrope_700Bold' }}
            >
              Выйти из аккаунта
            </Text>
            <Text className="text-muted text-lg">→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View>
      <Text className="text-muted text-xs" style={{ fontFamily: 'Manrope_500Medium' }}>
        {label}
      </Text>
      <Text className="text-gray-900 text-base mt-0.5" style={{ fontFamily: 'Manrope_600SemiBold' }}>
        {value}
      </Text>
      {sub && (
        <Text className="text-muted text-xs mt-0.5" style={{ fontFamily: 'Manrope_400Regular' }}>
          {sub}
        </Text>
      )}
    </View>
  );
}
