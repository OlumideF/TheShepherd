import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import {
  useDeleteAnnouncement,
  useDeleteComment,
  useDeleteGroupMessage,
  useDeletePrayer,
  useModerationAnnouncements,
  useModerationComments,
  useModerationGroupMessages,
  useModerationPrayers,
} from '@/features/admin/hooks/useModeration';
import { canAccessAdminHub } from '@/features/admin/utils/permissions';
import { useAuth } from '@/features/auth/hooks/useAuth';

type TabKey = 'announcements' | 'comments' | 'prayers' | 'messages';

export default function ModerationScreen() {
  const { profile } = useAuth();
  const allowed = canAccessAdminHub(profile);
  const [tab, setTab] = useState<TabKey>('announcements');

  const announcements = useModerationAnnouncements(allowed && tab === 'announcements');
  const comments = useModerationComments(allowed && tab === 'comments');
  const prayers = useModerationPrayers(allowed && tab === 'prayers');
  const messages = useModerationGroupMessages(allowed && tab === 'messages');

  const deleteAnnouncement = useDeleteAnnouncement();
  const deleteComment = useDeleteComment();
  const deletePrayer = useDeletePrayer();
  const deleteMessage = useDeleteGroupMessage();

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Moderation' }} />
        <AppText color={colors.danger}>Admins only.</AppText>
      </Screen>
    );
  }

  function confirmDelete(label: string, onConfirm: () => void) {
    Alert.alert(`Delete ${label}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Moderation' }} />
      <View style={styles.tabs}>
        {(
          [
            ['announcements', 'Announcements'],
            ['comments', 'Comments'],
            ['prayers', 'Prayers'],
            ['messages', 'Messages'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.chip, tab === key && styles.chipActive]}
          >
            <AppText
              variant="caption"
              color={tab === key ? '#fff' : colors.ink}
            >
              {label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === 'announcements' ? (
          announcements.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            announcements.data?.map((item) => (
              <ModRow
                key={item.id}
                title={item.title}
                body={item.body}
                meta={new Date(item.published_at).toLocaleString()}
                onDelete={() =>
                  confirmDelete('announcement', () =>
                    deleteAnnouncement.mutate(item.id),
                  )
                }
              />
            ))
          )
        ) : null}

        {tab === 'comments' ? (
          comments.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            comments.data?.map((item) => (
              <ModRow
                key={item.id}
                title={item.author_display_name || 'Comment'}
                body={item.body}
                meta={new Date(item.created_at).toLocaleString()}
                onDelete={() =>
                  confirmDelete('comment', () => deleteComment.mutate(item.id))
                }
              />
            ))
          )
        ) : null}

        {tab === 'prayers' ? (
          prayers.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            prayers.data?.map((item) => (
              <ModRow
                key={item.id}
                title={
                  item.is_anonymous
                    ? 'Anonymous'
                    : item.author_display_name || 'Prayer'
                }
                body={item.body}
                meta={`${item.visibility} · ${new Date(item.created_at).toLocaleString()}`}
                onDelete={() =>
                  confirmDelete('prayer', () => deletePrayer.mutate(item.id))
                }
              />
            ))
          )
        ) : null}

        {tab === 'messages' ? (
          messages.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            messages.data?.map((item) => (
              <ModRow
                key={item.id}
                title={item.author_display_name || 'Message'}
                body={item.body}
                meta={new Date(item.created_at).toLocaleString()}
                onDelete={() =>
                  confirmDelete('message', () =>
                    deleteMessage.mutate(item.id),
                  )
                }
              />
            ))
          )
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ModRow({
  title,
  body,
  meta,
  onDelete,
}: {
  title: string;
  body: string;
  meta: string;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText numberOfLines={4}>{body}</AppText>
      <AppText variant="caption" muted>
        {meta}
      </AppText>
      <Button label="Delete" variant="danger" onPress={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
});
