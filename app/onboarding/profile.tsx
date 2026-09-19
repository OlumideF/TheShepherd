import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';

export default function OnboardingProfile() {
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  async function onContinue() {
    if (!user?.id) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
      })
      .eq('id', user.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    await refreshProfile();
    router.push('/onboarding/privacy');
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
      >
        <AppText variant="title">Your profile</AppText>
        <AppText muted>Tell us how to greet you.</AppText>

        <View style={styles.form}>
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <TextField
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextField
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
          />
          <TextField
            label="Phone (optional)"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            value={phone}
            onChangeText={setPhone}
          />
          {error ? <AppText color={colors.danger}>{error}</AppText> : null}
          <Button
            label="Continue"
            loading={saving}
            disabled={!displayName.trim()}
            onPress={onContinue}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
