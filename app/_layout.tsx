import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Fraunces_600SemiBold,
  useFonts as useFraunces,
} from '@expo-google-fonts/fraunces';
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  useFonts as useSourceSans,
} from '@expo-google-fonts/source-sans-3';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/hooks/useAuth';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function AuthGate({ children }: { children: ReactNode }) {
  const { session, isLoading, isProfileLoading, needsOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (session && isProfileLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (!session) return;

    if (needsOnboarding && !inOnboarding) {
      router.replace('/onboarding' as Href);
      return;
    }

    if (!needsOnboarding && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [
    session,
    isLoading,
    isProfileLoading,
    needsOnboarding,
    segments,
    router,
  ]);

  if (isLoading || (session && isProfileLoading)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.canvas,
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return children;
}

export default function RootLayout() {
  const [frauncesLoaded] = useFraunces({ Fraunces_600SemiBold });
  const [sourceLoaded] = useSourceSans({
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
  });

  const fontsReady = frauncesLoaded && sourceLoaded;

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.canvas },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="member/[id]" options={{ headerShown: true, title: 'Member' }} />
            <Stack.Screen name="media/[id]" options={{ headerShown: true, title: 'Sermon' }} />
            <Stack.Screen name="media/albums/[id]" options={{ headerShown: true, title: 'Album' }} />
            <Stack.Screen name="events/create" options={{ headerShown: true, title: 'New event' }} />
            <Stack.Screen name="events/[id]/index" options={{ headerShown: true, title: 'Event' }} />
            <Stack.Screen name="events/[id]/edit" options={{ headerShown: true, title: 'Edit event' }} />
            <Stack.Screen name="prayer/index" options={{ headerShown: true, title: 'Prayer wall' }} />
            <Stack.Screen name="notifications/index" options={{ headerShown: true, title: 'Inbox' }} />
            <Stack.Screen name="announcements/create" options={{ headerShown: true, title: 'Announcement' }} />
            <Stack.Screen name="broadcasts/create" options={{ headerShown: true, title: 'Broadcast' }} />
            <Stack.Screen name="groups/create" options={{ headerShown: true, title: 'New group' }} />
            <Stack.Screen name="groups/join" options={{ headerShown: true, title: 'Join with code' }} />
            <Stack.Screen name="groups/[id]/index" options={{ headerShown: true, title: 'Group' }} />
            <Stack.Screen name="groups/[id]/add" options={{ headerShown: true, title: 'Add members' }} />
            <Stack.Screen name="admin/index" options={{ headerShown: true, title: 'Admin' }} />
            <Stack.Screen name="admin/media/index" options={{ headerShown: true, title: 'Publish media' }} />
            <Stack.Screen name="admin/media/create" options={{ headerShown: true, title: 'New sermon' }} />
            <Stack.Screen name="admin/media/[id]" options={{ headerShown: true, title: 'Edit sermon' }} />
            <Stack.Screen name="admin/albums/index" options={{ headerShown: true, title: 'Photo albums' }} />
            <Stack.Screen name="admin/albums/create" options={{ headerShown: true, title: 'New album' }} />
            <Stack.Screen name="admin/albums/[id]" options={{ headerShown: true, title: 'Edit album' }} />
            <Stack.Screen name="admin/members/index" options={{ headerShown: true, title: 'Roles & access' }} />
            <Stack.Screen name="admin/members/[id]" options={{ headerShown: true, title: 'Edit member' }} />
            <Stack.Screen name="admin/moderation/index" options={{ headerShown: true, title: 'Moderation' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
