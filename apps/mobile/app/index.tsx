import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/auth';

export default function Index() {
  const { session, loading } = useAuthStore();

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace('/(app)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [session, loading]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#E8564A" />
    </View>
  );
}
