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
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { useShiftStore } from '../../store/shift';

export default function EndShiftScreen() {
  const { user } = useAuthStore();
  const { activeShift, setActiveShift } = useShiftStore();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [productionKg, setProductionKg] = useState('');
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

  const handleEndShift = async () => {
    if (!photoUri) {
      Alert.alert('Фото обязательно', 'Сделайте фото продукции / рабочего места');
      return;
    }
    const kg = parseFloat(productionKg.replace(',', '.'));
    if (!kg || kg <= 0) {
      Alert.alert('Укажите выработку', 'Введите количество произведённой продукции в кг');
      return;
    }
    if (!user || !activeShift) return;

    setLoading(true);
    try {
      // 1. Get geolocation
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Нет доступа к геолокации', 'Разрешите доступ к геолокации в настройках');
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      // 2. Upload photo
      const fileName = `shifts/${user.id}/${Date.now()}_end.jpg`;
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('shift-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('shift-photos').getPublicUrl(fileName);

      // 3. Close shift
      const { error } = await supabase
        .from('shifts')
        .update({
          end_photo_url: publicUrl.publicUrl,
          end_lat: latitude,
          end_lng: longitude,
          end_time: new Date().toISOString(),
          production_kg: kg,
          status: 'closed',
        })
        .eq('id', activeShift.id);

      if (error) throw error;

      setActiveShift(null);
      Alert.alert(
        'Смена завершена!',
        `Выработка: ${kg} кг. Отличная работа!`,
        [{ text: 'OK', onPress: () => router.replace('/(app)/home') }],
      );
    } catch (err: any) {
      Alert.alert('Ошибка', err.message ?? 'Не удалось завершить смену');
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
        {/* Header */}
        <View className="bg-primary pt-14 pb-6 px-6 rounded-b-3xl">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-white/80 text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
              ← Назад
            </Text>
          </TouchableOpacity>
          <Text className="text-white text-2xl" style={{ fontFamily: 'Manrope_800ExtraBold' }}>
            Завершение смены
          </Text>
          <Text className="text-white/80 text-sm mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
            Сфотографируйте продукцию и укажите выработку
          </Text>
        </View>

        <View className="px-6 pt-6 pb-10 gap-5">
          {/* Photo */}
          <View>
            <Text className="text-gray-900 text-sm mb-2" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              Фото продукции / рабочего места
            </Text>
            <TouchableOpacity
              onPress={takePhoto}
              className="bg-white border-2 border-dashed border-border rounded-2xl h-52 items-center justify-center overflow-hidden"
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
                </View>
              )}
            </TouchableOpacity>
            {photoUri && (
              <TouchableOpacity
                onPress={takePhoto}
                className="bg-gray-100 rounded-xl py-2.5 items-center mt-2"
              >
                <Text className="text-gray-700 text-sm" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                  Переснять фото
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Production weight */}
          <View>
            <Text className="text-gray-900 text-sm mb-2" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              Выработка за смену (кг)
            </Text>
            <TextInput
              className="bg-white border border-border rounded-xl px-4 py-3.5 text-gray-900 text-base"
              style={{ fontFamily: 'Manrope_400Regular' }}
              placeholder="Например: 48.5"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={productionKg}
              onChangeText={setProductionKg}
            />
            <Text className="text-muted text-xs mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
              На основе этих данных будет рассчитана зарплата
            </Text>
          </View>

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${
              !photoUri || !productionKg || loading ? 'bg-primary/40' : 'bg-primary'
            }`}
            onPress={handleEndShift}
            disabled={!photoUri || !productionKg || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-base" style={{ fontFamily: 'Manrope_700Bold' }}>
                Завершить смену
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
