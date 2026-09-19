import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import {
  useCreatePrayerRequest,
  useMyGroupsForPrayer,
} from '@/features/communication/hooks/usePrayer';
import { colors, radii, spacing } from '@/constants/theme';
import type { PrayerVisibility } from '@/lib/supabase/types';

type PrayerComposeProps = {
  profileId: string;
};

const VISIBILITY_OPTIONS: { value: PrayerVisibility; label: string }[] = [
  { value: 'public', label: 'Public wall' },
  { value: 'group_only', label: 'My group' },
  { value: 'private', label: 'Private (only me)' },
];

export function PrayerCompose({ profileId }: PrayerComposeProps) {
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<PrayerVisibility>('public');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: groups = [] } = useMyGroupsForPrayer(profileId);
  const create = useCreatePrayerRequest();

  async function onSubmit() {
    setError(null);
    setMessage(null);
    if (!body.trim()) {
      setError('Write a prayer request first.');
      return;
    }
    if (visibility === 'group_only' && !groupId) {
      setError('Choose a group for group-only requests.');
      return;
    }
    try {
      await create.mutateAsync({
        authorId: profileId,
        body,
        visibility,
        isAnonymous,
        groupId,
      });
      setBody('');
      setMessage('Prayer request shared.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit.');
    }
  }

  return (
    <View style={styles.wrap}>
      <AppText variant="heading">Share a request</AppText>
      <TextField
        label="Prayer request"
        value={body}
        onChangeText={setBody}
        multiline
        style={styles.bodyInput}
      />

      <AppText variant="label" muted>
        Visibility
      </AppText>
      <View style={styles.options}>
        {VISIBILITY_OPTIONS.map((option) => {
          const active = visibility === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setVisibility(option.value)}
              style={[styles.option, active && styles.optionActive]}
            >
              <AppText color={active ? colors.accent : colors.ink}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {visibility === 'group_only' ? (
        <View style={styles.options}>
          {groups.length === 0 ? (
            <AppText muted variant="caption">
              Join a group first to post group-only requests.
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
      ) : null}

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isAnonymous }}
        onPress={() => setIsAnonymous((v) => !v)}
        style={styles.anonRow}
      >
        <View style={styles.anonText}>
          <AppText variant="bodyStrong">Post anonymously</AppText>
          <AppText variant="caption" muted>
            Your name is hidden on the wall.
          </AppText>
        </View>
        <Switch
          value={isAnonymous}
          onValueChange={setIsAnonymous}
          trackColor={{ false: colors.line, true: colors.accent }}
          thumbColor={colors.canvasElevated}
        />
      </Pressable>

      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
      {message ? <AppText color={colors.success}>{message}</AppText> : null}

      <Button
        label="Submit request"
        loading={create.isPending}
        onPress={onSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
  },
  bodyInput: {
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
    backgroundColor: colors.canvas,
  },
  optionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  anonText: {
    flex: 1,
    gap: 2,
  },
});
