import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/communication/hooks/useNotifications';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { colors, radii, spacing } from '@/constants/theme';
import type { AppNotification } from '@/lib/supabase/types';

export default function NotificationsScreen() {
  const { profile, user } = useAuth();
  const profileId = profile?.id ?? user?.id;
  const router = useRouter();
  const { data = [], isLoading, error } = useNotifications(profileId);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  function onOpen(notification: AppNotification) {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }
    const data = notification.data ?? {};
    if (typeof data.event_id === 'string') {
      router.push(`/events/${data.event_id}` as Href);
      return;
    }
    if (typeof data.prayer_request_id === 'string') {
      router.push('/prayer' as Href);
      return;
    }
    if (notification.category === 'announcements') {
      router.push('/(tabs)' as Href);
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <AppText variant="title">Inbox</AppText>
          <AppText muted>Announcements, broadcasts, reminders, and prayer.</AppText>
          {profileId && data.some((n) => !n.read_at) ? (
            <Button
              label="Mark all read"
              variant="ghost"
              loading={markAll.isPending}
              onPress={() => markAll.mutate(profileId)}
            />
          ) : null}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : error ? (
          <AppText color={colors.danger}>Could not load notifications.</AppText>
        ) : data.length === 0 ? (
          <AppText muted>You are all caught up.</AppText>
        ) : (
          <View style={styles.list}>
            {data.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => onOpen(item)}
                style={[styles.row, !item.read_at && styles.rowUnread]}
              >
                <AppText variant="caption" muted>
                  {item.category} ·{' '}
                  {new Date(item.created_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </AppText>
                <AppText variant="bodyStrong">{item.title}</AppText>
                <AppText muted>{item.body}</AppText>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rowUnread: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
});
