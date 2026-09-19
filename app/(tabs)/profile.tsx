import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile, isConfigured } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
  }, [profile]);

  async function onSave() {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      })
      .eq('id', user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await refreshProfile();
    setMessage('Profile saved.');
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Your profile</AppText>
        <AppText muted>{user?.email ?? 'Signed in'}</AppText>
      </View>

      <View style={styles.meta}>
        <MetaChip label="Role" value={profile?.role ?? '—'} />
        <MetaChip
          label="Membership"
          value={profile?.membership_status ?? '—'}
        />
      </View>

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
        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        {message ? <AppText color={colors.success}>{message}</AppText> : null}
        <Button
          label="Save changes"
          loading={saving}
          disabled={!isConfigured}
          onPress={onSave}
        />
        <Button label="Sign out" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.xs,
  },
  form: {
    gap: spacing.md,
  },
});
