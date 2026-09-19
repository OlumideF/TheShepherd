import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import type { OnboardingIntent } from '@/lib/supabase/types';

export default function OnboardingIntent() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [intent, setIntent] = useState<OnboardingIntent>('member');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFinish() {
    setSaving(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc('complete_onboarding', {
      p_intent: intent,
    });

    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    await refreshProfile();
    router.replace('/(tabs)');
  }

  return (
    <Screen>
      <View style={styles.wrap}>
        <AppText variant="title">How are you joining?</AppText>
        <AppText muted>
          Visitors can explore. Members are marked pending until the church
          confirms membership.
        </AppText>

        <View style={styles.choices}>
          <Choice
            title="I'm a visitor"
            body="Browse and stay connected while visiting."
            selected={intent === 'visitor'}
            onPress={() => setIntent('visitor')}
          />
          <Choice
            title="I want to join as a member"
            body="We'll mark your profile as pending for review."
            selected={intent === 'member'}
            onPress={() => setIntent('member')}
          />
        </View>

        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button label="Finish setup" loading={saving} onPress={onFinish} />
      </View>
    </Screen>
  );
}

function Choice({
  title,
  body,
  selected,
  onPress,
}: {
  title: string;
  body: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText variant="caption" muted>
        {body}
      </AppText>
    </Pressable>
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
    marginVertical: spacing.sm,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
});
