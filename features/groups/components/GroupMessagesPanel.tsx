import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import {
  useDeleteGroupMessage,
  usePostGroupMessage,
} from '@/features/groups/hooks/useGroups';
import type { GroupMessage } from '@/lib/supabase/types';

type GroupMessagesPanelProps = {
  groupId: string;
  profileId: string | undefined;
  canModerate: boolean;
  messages: GroupMessage[];
};

export function GroupMessagesPanel({
  groupId,
  profileId,
  canModerate,
  messages,
}: GroupMessagesPanelProps) {
  const [draft, setDraft] = useState('');
  const post = usePostGroupMessage();
  const remove = useDeleteGroupMessage();

  async function onPost() {
    if (!profileId || !draft.trim()) return;
    await post.mutateAsync({
      groupId,
      authorId: profileId,
      body: draft,
    });
    setDraft('');
  }

  return (
    <View style={styles.wrap}>
      <AppText variant="heading">Discussion</AppText>
      <AppText muted variant="caption">
        In-group messages for members. Use Broadcast for push outreach.
      </AppText>

      <TextField
        label="Write a message"
        value={draft}
        onChangeText={setDraft}
        multiline
        style={styles.input}
      />
      <Button
        label="Post"
        loading={post.isPending}
        disabled={!draft.trim() || !profileId}
        onPress={onPost}
      />

      <View style={styles.list}>
        {messages.length === 0 ? (
          <AppText muted>No messages yet.</AppText>
        ) : (
          messages.map((msg) => {
            const canDelete =
              canModerate || (profileId != null && msg.author_id === profileId);
            const when = new Date(msg.created_at).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });
            return (
              <View key={msg.id} style={styles.message}>
                <View style={styles.messageHeader}>
                  <AppText variant="caption" muted>
                    {msg.author_display_name || 'Member'} · {when}
                  </AppText>
                  {canDelete ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete message"
                      onPress={() =>
                        remove.mutate({ messageId: msg.id, groupId })
                      }
                    >
                      <AppText variant="caption" color={colors.danger}>
                        Delete
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
                <AppText>{msg.body}</AppText>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  input: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  list: {
    gap: spacing.sm,
  },
  message: {
    backgroundColor: colors.canvasElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
