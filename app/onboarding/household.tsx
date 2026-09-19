import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, spacing } from '@/constants/theme';
import { useHousehold } from '@/features/members/hooks/useHousehold';

export default function OnboardingHousehold() {
  const router = useRouter();
  const { createHousehold, joinHousehold } = useHousehold();
  const [mode, setMode] = useState<'skip' | 'create' | 'join'>('skip');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    setError(null);
    try {
      if (mode === 'create') {
        if (!name.trim()) {
          setError('Enter a household name.');
          return;
        }
        await createHousehold.mutateAsync(name.trim());
      } else if (mode === 'join') {
        if (!code.trim()) {
          setError('Enter an invite code.');
          return;
        }
        await joinHousehold.mutateAsync(code.trim());
      }
      router.push('/onboarding/intent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  const busy = createHousehold.isPending || joinHousehold.isPending;

  return (
    <Screen>
      <View style={styles.wrap}>
        <AppText variant="title">Household</AppText>
        <AppText muted>
          Link your family under one household, or skip for now.
        </AppText>

        <View style={styles.choices}>
          <Button
            label="Skip for now"
            variant={mode === 'skip' ? 'primary' : 'ghost'}
            onPress={() => setMode('skip')}
          />
          <Button
            label="Create a household"
            variant={mode === 'create' ? 'primary' : 'ghost'}
            onPress={() => setMode('create')}
          />
          <Button
            label="Join with invite code"
            variant={mode === 'join' ? 'primary' : 'ghost'}
            onPress={() => setMode('join')}
          />
        </View>

        {mode === 'create' ? (
          <TextField
            label="Household name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. The Adeyemi Family"
          />
        ) : null}

        {mode === 'join' ? (
          <TextField
            label="Invite code"
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
            placeholder="ABC123"
          />
        ) : null}

        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button label="Continue" loading={busy} onPress={onContinue} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  choices: {
    gap: spacing.sm,
  },
});
