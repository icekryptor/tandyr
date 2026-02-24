import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth';

export default function AppLayout() {
  const { session, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/login');
    }
  }, [session, loading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="start-shift" />
      <Stack.Screen name="end-shift" />
      <Stack.Screen name="tech-request" />
      <Stack.Screen name="chats" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="progress" />
    </Stack>
  );
}
