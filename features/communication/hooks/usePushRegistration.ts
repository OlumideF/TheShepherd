import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { supabase } from '@/lib/supabase/client';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function resolveProjectId(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId
  );
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    console.warn(
      'Push registration skipped: set EXPO_PUBLIC_EAS_PROJECT_ID or configure EAS projectId.',
    );
    return null;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;
  return token;
}

export function usePushRegistration(profileId: string | undefined) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async () => {
    if (!profileId) return null;
    try {
      setError(null);
      const pushToken = await registerForPushNotificationsAsync();
      setToken(pushToken);
      if (!pushToken) return null;

      const { error: upsertError } = await supabase.from('push_tokens').upsert(
        {
          profile_id: profileId,
          token: pushToken,
          platform: Platform.OS,
        },
        { onConflict: 'profile_id,token' },
      );
      if (upsertError) throw upsertError;
      return pushToken;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Push registration failed';
      setError(message);
      return null;
    }
  }, [profileId]);

  useEffect(() => {
    void register();
  }, [register]);

  return { token, error, register };
}
