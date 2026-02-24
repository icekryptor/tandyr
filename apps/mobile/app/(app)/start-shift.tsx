import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { useShiftStore } from '../../store/shift';
import { findNearestStore } from '../../lib/shared/utils';
import type { Shift, Store } from '../../lib/shared/types';

export default function StartShiftScreen() {
  const { user } = useAuthStore();
  const { setActiveShift } = useShiftStore();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа к камере', 'Разрешите доступ к камере в настройках');
      return;
    }
    // Camera only — no gallery access
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

  const handleStartShift = async () => {
    if (!photoUri) {
      Alert.alert('Фото обязательно', 'Сделайте фото рабочего места');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      // 1. Get geolocation
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        Alert.alert('Нет доступа к геолокации', 'Разрешите доступ к геолокации в настройках');
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      // 2. Find nearest store
      const { data: stores } = await supabase.from('stores').select('*');
      const nearest = findNearestStore(stores as Store[] ?? [], latitude, longitude);
      if (!nearest) {
        Alert.alert('Ошибка', 'Не удалось найти ближайший магазин');
        setLoading(false);
        return;
      }

      // 3. Upload photo
      const fileName = `shifts/${user.id}/${Date.now()}_start.jpg`;
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('shift-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('shift-photos').getPublicUrl(fileName);

      // 4. Create shift record
      const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          user_id: user.id,
          store_id: nearest.id,
          start_photo_url: publicUrl.publicUrl,
          start_lat: latitude,
          start_lng: longitude,
          start_time: new Date().toISOString(),
          status: 'open',
        })
        .select('*, store:stores(name, address)')
        .single();

      if (shiftError) throw shiftError;

      setActiveShift(shift as Shift);
      router.replace('/(app)/home');
    } catch (err: any) {
      Alert.alert('Ошибка', err.message ?? 'Не удалось открыть смену');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
      {/* Header */}
      <View className="bg-primary pt-14 pb-6 px-6 rounded-b-3xl">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-white/80 text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
            ← Назад
          </Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl" style={{ fontFamily: 'Manrope_800ExtraBold' }}>
          Начало смены
        </Text>
        <Text className="text-white/80 text-sm mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
          Сфотографируйте рабочее место
        </Text>
      </View>

      <View className="px-6 pt-6 pb-10 gap-5">
        {/* Photo area */}
        <TouchableOpacity
          onPress={takePhoto}
          className="bg-white border-2 border-dashed border-border rounded-2xl h-60 items-center justify-center overflow-hidden"
          activeOpacity={0.8}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="items-center gap-3">
              <Text className="text-4xl">📷</Text>
              <Text className="text-gray-700 text-base" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                Сделать фото
              </Text>
              <Text className="text-muted text-sm text-center px-4" style={{ fontFamily: 'Manrope_400Regular' }}>
                Нажмите, чтобы открыть камеру
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {photoUri && (
          <TouchableOpacity
            onPress={takePhoto}
            className="bg-gray-100 rounded-xl py-3 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-gray-700 text-sm" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              Переснять фото
            </Text>
          </TouchableOpacity>
        )}

        {/* Info block */}
        <View className="bg-accent/5 rounded-2xl p-4 border border-accent/20">
          <Text className="text-accent text-sm" style={{ fontFamily: 'Manrope_600SemiBold' }}>
            Что произойдёт после отправки?
          </Text>
          <View className="mt-3 gap-2">
            {[
              '📍 Определение вашего магазина по геолокации',
              '🕐 Фиксация времени начала смены',
              '📂 Сохранение фото рабочего места',
              '🆔 Открытие смены с уникальным ID',
            ].map((item) => (
              <Text key={item} className="text-gray-700 text-sm" style={{ fontFamily: 'Manrope_400Regular' }}>
                {item}
              </Text>
            ))}
          </View>
        </View>

        <TouchableOpacity
          className={`rounded-2xl py-4 items-center mt-2 ${
            !photoUri || loading ? 'bg-primary/40' : 'bg-primary'
          }`}
          onPress={handleStartShift}
          disabled={!photoUri || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-base" style={{ fontFamily: 'Manrope_700Bold' }}>
              Начать смену
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
