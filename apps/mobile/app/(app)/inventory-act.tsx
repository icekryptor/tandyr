import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';

const RESOURCES = [
  { key: 'flour',    label: 'Мука',         unit: 'кг', emoji: '🌾' },
  { key: 'sugar',    label: 'Сахар',        unit: 'кг', emoji: '🍬' },
  { key: 'salt',     label: 'Соль',         unit: 'кг', emoji: '🧂' },
  { key: 'dry_milk', label: 'Сухое молоко', unit: 'кг', emoji: '🥛' },
  { key: 'yeast',    label: 'Дрожжи',       unit: 'кг', emoji: '🧫' },
  { key: 'oil',      label: 'Масло',        unit: 'кг', emoji: '🫙' },
];

export default function InventoryActScreen() {
  const { actId } = useLocalSearchParams<{ actId: string }>();
  const { user } = useAuthStore();

  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(RESOURCES.map((r) => [r.key, '']))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    // Validate all fields filled
    const missing = RESOURCES.filter((r) => !quantities[r.key] || isNaN(parseFloat(quantities[r.key])));
    if (missing.length > 0) {
      setError(`Заполните все поля (не заполнено: ${missing.map((r) => r.label).join(', ')})`);
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();

      if (actId) {
        // Update existing act
        const { error: updateError } = await supabase
          .from('inventory_acts')
          .update({ status: 'completed', conducted_at: now })
          .eq('id', actId);
        if (updateError) throw updateError;

        // Insert items
        const items = RESOURCES.map((r) => ({
          act_id: actId,
          resource_type: r.key,
          item_name: r.label,
          quantity_kg: parseFloat(quantities[r.key]),
        }));
        const { error: itemsError } = await supabase.from('inventory_act_items').insert(items);
        if (itemsError) throw itemsError;
      } else {
        // No act assigned — create one ad hoc
        Alert.alert(
          'Инвентаризация',
          'У вас нет запланированной инвентаризации. Обратитесь к управляющему.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        '✓ Инвентаризация проведена',
        'Данные успешно сохранены',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      setError(err?.message ?? 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="bg-primary pt-14 pb-6 px-6 rounded-b-3xl">
          <TouchableOpacity onPress={() => router.back()} className="mb-3">
            <Text className="text-white/70 text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
              ← Назад
            </Text>
          </TouchableOpacity>
          <Text className="text-white text-xl" style={{ fontFamily: 'Manrope_700Bold' }}>
            Инвентаризация
          </Text>
          <Text className="text-white/70 text-sm mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
            Укажите остатки сырья в кг
          </Text>
        </View>

        <View className="px-6 pt-6 gap-4">
          {/* Resource fields */}
          {RESOURCES.map((resource) => (
            <View
              key={resource.key}
              className="bg-white rounded-2xl p-4 border border-border"
            >
              <View className="flex-row items-center gap-3 mb-3">
                <Text className="text-2xl">{resource.emoji}</Text>
                <View>
                  <Text className="text-gray-900 text-base" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                    {resource.label}
                  </Text>
                  <Text className="text-muted text-xs" style={{ fontFamily: 'Manrope_400Regular' }}>
                    Остаток в {resource.unit}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-gray-900 text-base border border-gray-100"
                  style={{ fontFamily: 'Manrope_500Medium' }}
                  value={quantities[resource.key]}
                  onChangeText={(v) => setQuantities((prev) => ({ ...prev, [resource.key]: v }))}
                  placeholder="0.0"
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
                <Text className="text-muted text-sm w-8" style={{ fontFamily: 'Manrope_500Medium' }}>
                  {resource.unit}
                </Text>
              </View>
            </View>
          ))}

          {/* Error */}
          {error && (
            <View className="bg-red-50 rounded-xl p-4 border border-red-100">
              <Text className="text-red-700 text-sm" style={{ fontFamily: 'Manrope_500Medium' }}>
                {error}
              </Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${loading ? 'bg-primary/50' : 'bg-primary'}`}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-base" style={{ fontFamily: 'Manrope_700Bold' }}>
                Отправить инвентаризацию
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
