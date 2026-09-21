import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing } from '@/constants/theme';
import { useRotateGroupInvite } from '@/features/groups/hooks/useGroups';
import {
  copyText,
  groupInviteUrl,
  shareGroupInvite,
} from '@/features/groups/utils/invite';
import type { ChurchGroup } from '@/lib/supabase/types';

type GroupInvitePanelProps = {
  group: ChurchGroup;
};

export function GroupInvitePanel({ group }: GroupInvitePanelProps) {
  const router = useRouter();
  const rotate = useRotateGroupInvite();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onShare() {
    setError(null);
    setFeedback(null);
    try {
      await shareGroupInvite({
        groupName: group.name,
        inviteCode: group.invite_code,
      });
      setFeedback('Invite shared.');
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Could not share invite.');
    }
  }

  async function onCopyLink() {
    setError(null);
    try {
      await copyText(groupInviteUrl(group.invite_code));
      setFeedback('Invite link copied.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not copy link.');
    }
  }

  async function onCopyCode() {
    setError(null);
    try {
      await copyText(group.invite_code);
      setFeedback('Invite code copied.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not copy code.');
    }
  }

  async function onRotate() {
    setError(null);
    setFeedback(null);
    try {
      await rotate.mutateAsync(group.id);
      setFeedback('New invite code generated. Old links stop working.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not rotate code.');
    }
  }

  return (
    <View style={styles.panel}>
      <AppText variant="heading">Invite people</AppText>
      <AppText muted>
        Add members yourself, or send an invite link. Anyone with the code joins
        as an approved member.
      </AppText>

      <View style={styles.codeBox}>
        <AppText variant="caption" muted>
          Invite code
        </AppText>
        <AppText variant="title" style={styles.code}>
          {group.invite_code}
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button label="Share invite" onPress={onShare} />
        <Button label="Copy link" variant="secondary" onPress={onCopyLink} />
        <Button label="Copy code" variant="ghost" onPress={onCopyCode} />
        <Button
          label="Add members"
          variant="secondary"
          onPress={() =>
            router.push(`/groups/${group.id}/add` as Href)
          }
        />
        <Button
          label="New code"
          variant="ghost"
          loading={rotate.isPending}
          onPress={onRotate}
        />
      </View>

      {feedback ? <AppText color={colors.accent}>{feedback}</AppText> : null}
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
  codeBox: {
    gap: 2,
    paddingVertical: spacing.sm,
  },
  code: {
    letterSpacing: 3,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
