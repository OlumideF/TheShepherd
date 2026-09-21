import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  canManageGroups,
  useCreateGroup,
} from '@/features/groups/hooks/useGroups';

export default function CreateGroupScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const create = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed = canManageGroups(profile?.role);

  async function onSubmit() {
    setError(null);
    if (!allowed) {
      setError('Only admins and group leaders can create groups.');
      return;
    }
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    try {
      const group = await create.mutateAsync({
        name,
        description,
        requiresApproval,
      });
      router.replace(`/groups/${group.id}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create group.');
    }
  }

  if (!allowed) {
    return (
      <Screen>
        <AppText color={colors.danger}>Leaders and admins only.</AppText>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="title">New group</AppText>
        <AppText muted>
          You become the leader. After creating, you can add members or share an
          invite link. Members can also request to join unless you turn off
          approval.
        </AppText>

        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          style={styles.body}
        />

        <AppText variant="label" muted>
          Join approval
        </AppText>
        <View style={styles.options}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: requiresApproval }}
            onPress={() => setRequiresApproval(true)}
            style={[styles.option, requiresApproval && styles.optionActive]}
          >
            <AppText color={requiresApproval ? colors.accent : colors.ink}>
              Require approval
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: !requiresApproval }}
            onPress={() => setRequiresApproval(false)}
            style={[styles.option, !requiresApproval && styles.optionActive]}
          >
            <AppText color={!requiresApproval ? colors.accent : colors.ink}>
              Open join
            </AppText>
          </Pressable>
        </View>

        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button label="Create group" loading={create.isPending} onPress={onSubmit} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  body: {
    minHeight: 100,
    textAlignVertical: 'top',
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
});
