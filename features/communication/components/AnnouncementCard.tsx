import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ANNOUNCEMENT_REACTION_EMOJIS } from '@/features/communication/constants';
import {
  useAddAnnouncementComment,
  useToggleAnnouncementReaction,
  type AnnouncementWithMeta,
} from '@/features/communication/hooks/useAnnouncements';
import { colors, radii, spacing } from '@/constants/theme';

type AnnouncementCardProps = {
  announcement: AnnouncementWithMeta;
  profileId: string | undefined;
};

export function AnnouncementCard({ announcement, profileId }: AnnouncementCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const toggleReaction = useToggleAnnouncementReaction();
  const addComment = useAddAnnouncementComment();

  const reactionCounts = useMemo(() => {
    const map = new Map<string, { count: number; mineId?: string }>();
    for (const emoji of ANNOUNCEMENT_REACTION_EMOJIS) {
      map.set(emoji, { count: 0 });
    }
    for (const reaction of announcement.announcement_reactions ?? []) {
      const entry = map.get(reaction.emoji) ?? { count: 0 };
      entry.count += 1;
      if (profileId && reaction.profile_id === profileId) {
        entry.mineId = reaction.id;
      }
      map.set(reaction.emoji, entry);
    }
    return map;
  }, [announcement.announcement_reactions, profileId]);

  const comments = announcement.announcement_comments ?? [];
  const publishedLabel = new Date(announcement.published_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  async function onReact(emoji: string) {
    if (!profileId) return;
    const existing = reactionCounts.get(emoji);
    await toggleReaction.mutateAsync({
      announcementId: announcement.id,
      profileId,
      emoji,
      existingId: existing?.mineId,
    });
  }

  async function onSubmitComment() {
    if (!profileId || !draft.trim()) return;
    await addComment.mutateAsync({
      announcementId: announcement.id,
      authorId: profileId,
      body: draft,
    });
    setDraft('');
    setCommentsOpen(true);
  }

  return (
    <View style={styles.card}>
      <AppText variant="caption" muted>
        {publishedLabel}
      </AppText>
      <AppText variant="heading">{announcement.title}</AppText>
      <AppText>{announcement.body}</AppText>

      <View style={styles.reactions}>
        {ANNOUNCEMENT_REACTION_EMOJIS.map((emoji) => {
          const entry = reactionCounts.get(emoji);
          const active = Boolean(entry?.mineId);
          return (
            <Pressable
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={`React ${emoji}`}
              accessibilityState={{ selected: active }}
              onPress={() => onReact(emoji)}
              style={[styles.reactionChip, active && styles.reactionChipActive]}
            >
              <AppText>
                {emoji}
                {entry && entry.count > 0 ? ` ${entry.count}` : ''}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: commentsOpen }}
        onPress={() => setCommentsOpen((v) => !v)}
        style={styles.commentsToggle}
      >
        <AppText variant="bodyStrong" color={colors.accent}>
          {commentsOpen ? 'Hide comments' : `Comments (${comments.length})`}
        </AppText>
      </Pressable>

      {commentsOpen ? (
        <View style={styles.comments}>
          {comments.length === 0 ? (
            <AppText muted variant="caption">
              Be the first to comment.
            </AppText>
          ) : (
            comments
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              )
              .map((comment) => {
                const name = comment.author_display_name || 'Member';
                return (
                  <View key={comment.id} style={styles.comment}>
                    <AppText variant="caption" muted>
                      {name}
                    </AppText>
                    <AppText>{comment.body}</AppText>
                  </View>
                );
              })
          )}

          <TextField
            label="Add a comment"
            value={draft}
            onChangeText={setDraft}
            multiline
            style={styles.commentInput}
          />
          <Button
            label="Post comment"
            variant="secondary"
            loading={addComment.isPending}
            disabled={!draft.trim() || !profileId}
            onPress={onSubmitComment}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  reactionChip: {
    minHeight: 40,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  reactionChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  commentsToggle: {
    paddingVertical: spacing.xs,
  },
  comments: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
  comment: {
    gap: 2,
  },
  commentInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
