import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { LoginSchema, type LoginInput } from '../../lib/shared/schemas';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Ошибка входа', error.message);
    } else {
      router.replace('/(app)/home');
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-20 pb-10">
          {/* Logo area */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 rounded-3xl bg-primary items-center justify-center mb-4">
              <Text className="text-white text-4xl font-bold">Т</Text>
            </View>
            <Text className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Manrope_800ExtraBold' }}>
              Tandyr
            </Text>
            <Text className="text-muted mt-1 text-base" style={{ fontFamily: 'Manrope_400Regular' }}>
              Система управления сменами
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-gray-700 text-sm mb-2" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                Email
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`bg-white border rounded-xl px-4 py-3.5 text-gray-900 text-base ${
                      errors.email ? 'border-destructive' : 'border-border'
                    }`}
                    style={{ fontFamily: 'Manrope_400Regular' }}
                    placeholder="ivan@tandyr.kz"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.email && (
                <Text className="text-destructive text-xs mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
                  {errors.email.message}
                </Text>
              )}
            </View>

            <View>
              <Text className="text-gray-700 text-sm mb-2" style={{ fontFamily: 'Manrope_600SemiBold' }}>
                Пароль
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`bg-white border rounded-xl px-4 py-3.5 text-gray-900 text-base ${
                      errors.password ? 'border-destructive' : 'border-border'
                    }`}
                    style={{ fontFamily: 'Manrope_400Regular' }}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.password && (
                <Text className="text-destructive text-xs mt-1" style={{ fontFamily: 'Manrope_400Regular' }}>
                  {errors.password.message}
                </Text>
              )}
            </View>

            <TouchableOpacity
              className={`rounded-xl py-4 items-center mt-2 ${loading ? 'bg-primary/60' : 'bg-primary'}`}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-base" style={{ fontFamily: 'Manrope_700Bold' }}>
                  Войти
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-center text-muted text-xs mt-8" style={{ fontFamily: 'Manrope_400Regular' }}>
            Войдите с учётными данными, выданными администратором
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
