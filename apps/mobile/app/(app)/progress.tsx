import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useShiftStore } from '../../store/shift';

export default function ProgressScreen() {
  const { activeShift } = useShiftStore();
  const [productionKg, setProductionKg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const kg = parseFloat(productionKg.replace(',', '.'));
    if (!kg || kg <= 0) {
      Alert.alert('Укажите количество', 'Введите количество кг');
      return;
    }
    if (!activeShift) return;

    setLoading(true);
    const { error } = await supabase.from('progress_reports').insert({
      shift_id: activeShift.id,
      production_kg: kg,
      reported_at: new Date().toISOString(),
    });
    setLoading(false);

    if (error) {
      Alert.alert('Ошибка', error.message);
    } else {
      Alert.alert('Отправлено!', 'Промежуточный прогресс сохранён', [
        { text: 'OK', onPress: () => router.back() },
      ]);
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
            Промежуточный прогресс
          </Text>
          <Text className="text-white/80 text-sm mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
            Сколько кг продукции готово на сейчас?
          </Text>
        </View>

        <View className="px-6 pt-8 pb-10 gap-5">
          <View className="bg-white rounded-2xl p-5 border border-border">
            <Text className="text-gray-700 text-sm mb-2" style={{ fontFamily: 'Manrope_600SemiBold' }}>
              Произведено продукции (кг)
            </Text>
            <TextInput
              className="bg-background border border-border rounded-xl px-4 py-3.5 text-gray-900 text-2xl text-center"
              style={{ fontFamily: 'Manrope_700Bold' }}
              placeholder="0.0"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={productionKg}
              onChangeText={setProductionKg}
            />
          </View>

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center ${
              !productionKg || loading ? 'bg-primary/40' : 'bg-primary'
            }`}
            onPress={handleSubmit}
            disabled={!productionKg || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-base" style={{ fontFamily: 'Manrope_700Bold' }}>
                Отправить прогресс
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
