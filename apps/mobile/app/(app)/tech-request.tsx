import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { useShiftStore } from '../../store/shift';

export default function TechRequestScreen() {
  const { user } = useAuthStore();
  const { activeShift } = useShiftStore();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа к камере', 'Разрешите доступ к камере в настройках');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
      exif: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (description.trim().length < 10) {
      Alert.alert('Описание', 'Опишите проблему подробнее (минимум 10 символов)');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      let photoUrl: string | null = null;

      if (photoUri) {
        const fileName = `tech-requests/${user.id}/${Date.now()}.jpg`;
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const { error: uploadError } = await supabase.storage
          .from('tech-request-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('tech-request-photos').getPublicUrl(fileName);
        photoUrl = data.publicUrl;
      }

      const { error } = await supabase.from('tech_requests').insert({
        user_id: user.id,
        shift_id: activeShift?.id ?? null,
        photo_url: photoUrl,
        description: description.trim(),
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert('Заявка отправлена!', 'Технический отдел получил вашу заявку', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Ошибка', err.message ?? 'Не удалось отправить заявку');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="bg-primary pt-14 pb-6 px-6 rounded-b-3xl">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-white/80 text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
              ← Назад
            </Text>
          </TouchableOpacity>
          <Text className="text-white text-2xl" style={{ fontFamily: 'Manrope_800ExtraBold' }}>
            Техническая заявка
          </Text>
          <Text className="text-white/80 text-sm mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
            Опишите поломку или неисправность
          </Text>
        </View>

        <View className="px-6 pt-6 pb-10 gap-5">
          {/* Photo (optional) */}
          <View>
            <Text className="text-gray-900 text-sm mb-2" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              Фото (необязательно)
            </Text>
            <TouchableOpacity
              onPress={takePhoto}
              className="bg-white border-2 border-dashed border-border rounded-2xl h-40 items-center justify-center overflow-hidden"
              activeOpacity={0.8}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="items-center gap-2">
                  <Text className="text-3xl">📷</Text>
                  <Text className="text-gray-500 text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
                    Добавить фото
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {photoUri && (
              <TouchableOpacity
                onPress={takePhoto}
                className="bg-gray-100 rounded-xl py-2.5 items-center mt-2"
              >
                <Text className="text-gray-700 text-sm" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                  Переснять
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Description */}
          <View>
            <Text className="text-gray-900 text-sm mb-2" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              Описание проблемы *
            </Text>
            <TextInput
              className="bg-white border border-border rounded-xl px-4 py-3.5 text-gray-900 text-base"
              style={{ fontFamily: 'Manrope_400Regular', height: 120, textAlignVertical: 'top' }}
              placeholder="Опишите, что сломалось или не работает..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={description}
              onChangeText={setDescription}
            />
            <Text className="text-muted text-xs mt-1 text-right" style={{ fontFamily: 'Manrope_400Regular' }}>
              {description.length} / 500
            </Text>
          </View>

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${
              description.trim().length < 10 || loading ? 'bg-primary/40' : 'bg-primary'
            }`}
            onPress={handleSubmit}
            disabled={description.trim().length < 10 || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-base" style={{ fontFamily: 'Manrope_700Bold' }}>
                Отправить заявку
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
