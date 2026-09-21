import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, spacing } from '@/constants/theme';
import { useJoinGroupByInvite } from '@/features/groups/hooks/useGroups';

export default function JoinGroupByInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const initial =
    typeof params.code === 'string' ? params.code.trim().toUpperCase() : '';
  const [code, setCode] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const join = useJoinGroupByInvite();

  useEffect(() => {
    if (initial) setCode(initial);
  }, [initial]);

  async function onSubmit() {
    setError(null);
    if (!code.trim()) {
      setError('Enter an invite code.');
      return;
    }
    try {
      const membership = await join.mutateAsync(code);
      router.replace(`/groups/${membership.group_id}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join group.');
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Join with code' }} />
      <View style={styles.content}>
        <AppText variant="title">Join a group</AppText>
        <AppText muted>
          Enter the invite code from a leader or admin. You will be added as an
          approved member.
        </AppText>
        <TextField
          label="Invite code"
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ABC123"
        />
        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button
          label="Join group"
          loading={join.isPending}
          onPress={onSubmit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
});
