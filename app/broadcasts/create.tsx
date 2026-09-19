import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import {
  useCreateBroadcast,
  useLeadableGroups,
} from '@/features/communication/hooks/useNotifications';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { colors, radii, spacing } from '@/constants/theme';

export default function CreateBroadcastScreen() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const profileId = profile?.id ?? user?.id;
  const isAdmin = profile?.role === 'admin';
  const canBroadcast =
    profile?.role === 'admin' || profile?.role === 'group_leader';

  const { data: groups = [] } = useLeadableGroups(profileId, isAdmin);
  const create = useCreateBroadcast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!canBroadcast || !profileId) {
      setError('Only admins and group leaders can broadcast.');
      return;
    }
    if (!title.trim() || !body.trim() || !groupId) {
      setError('Title, body, and group are required.');
      return;
    }
    try {
      await create.mutateAsync({
        title,
        body,
        groupId,
        authorId: profileId,
      });
      router.replace('/notifications' as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send broadcast.');
    }
  }

  if (!canBroadcast) {
    return (
      <Screen>
        <AppText color={colors.danger}>Leaders and admins only.</AppText>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="title">Group broadcast</AppText>
        <AppText muted>
          Sends an in-app notification (and push when configured) to approved
          members of one group.
        </AppText>

        <AppText variant="label" muted>
          Target group
        </AppText>
        <View style={styles.options}>
          {groups.length === 0 ? (
            <AppText muted variant="caption">
              No leadable groups found. Ask an admin to assign you as a leader.
            </AppText>
          ) : (
            groups.map((group) => {
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
            })
          )}
        </View>

        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField
          label="Message"
          value={body}
          onChangeText={setBody}
          multiline
          style={styles.body}
        />
        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button label="Send broadcast" loading={create.isPending} onPress={onSubmit} />
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
