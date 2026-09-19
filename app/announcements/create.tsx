import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useCreateAnnouncement } from '@/features/communication/hooks/useAnnouncements';
import { useLeadableGroups } from '@/features/communication/hooks/useNotifications';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { colors, radii, spacing } from '@/constants/theme';

export default function CreateAnnouncementScreen() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId?: string }>();
  const create = useCreateAnnouncement();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profileId = profile?.id ?? user?.id;
  const isAdmin = profile?.role === 'admin';
  const isLeader = profile?.role === 'group_leader';
  const canPost = isAdmin || isLeader;

  const { data: groups = [] } = useLeadableGroups(profileId, isAdmin);

  useEffect(() => {
    if (typeof params.groupId === 'string' && params.groupId.length > 0) {
      setGroupId(params.groupId);
    }
  }, [params.groupId]);

  async function onSubmit() {
    setError(null);
    if (!canPost || !profileId) {
      setError('Only admins and group leaders can publish announcements.');
      return;
    }
    if (!isAdmin && !groupId) {
      setError('Leaders must choose a group.');
      return;
    }
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    try {
      await create.mutateAsync({
        title,
        body,
        authorId: profileId,
        groupId,
      });
      if (groupId) {
        router.replace(`/groups/${groupId}` as Href);
      } else {
        router.replace('/(tabs)' as Href);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish.');
    }
  }

  if (!canPost) {
    return (
      <Screen>
        <AppText color={colors.danger}>Admins and leaders only.</AppText>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="title">New announcement</AppText>
        <AppText muted>
          Church-wide posts go to everyone. Group posts notify that group and
          appear on the group page.
        </AppText>

        <AppText variant="label" muted>
          Audience
        </AppText>
        <View style={styles.options}>
          {isAdmin ? (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: groupId === null }}
              onPress={() => setGroupId(null)}
              style={[styles.option, groupId === null && styles.optionActive]}
            >
              <AppText color={groupId === null ? colors.accent : colors.ink}>
                Church-wide
              </AppText>
            </Pressable>
          ) : null}
          {groups.map((group) => {
            const active = groupId === group.id;
            return (
              <Pressable
                key={group.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setGroupId(group.id)}
                style={[styles.option, active && styles.optionActive]}
              >
                <AppText color={active ? colors.accent : colors.ink}>
                  {group.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField
          label="Body"
          value={body}
          onChangeText={setBody}
          multiline
          style={styles.body}
        />
        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button label="Publish" loading={create.isPending} onPress={onSubmit} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
  optionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  body: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
});
