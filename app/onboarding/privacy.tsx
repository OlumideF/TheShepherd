import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PrivacyToggles } from '@/features/members/components/PrivacyToggles';
import { supabase } from '@/lib/supabase/client';

export default function OnboardingPrivacy() {
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();
  const [directoryVisible, setDirectoryVisible] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showPhoto, setShowPhoto] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDirectoryVisible(profile?.directory_visible ?? false);
    setShowEmail(profile?.show_email ?? false);
    setShowPhone(profile?.show_phone ?? false);
    setShowPhoto(profile?.show_photo ?? true);
  }, [profile]);

  async function onContinue() {
    if (!user?.id) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        directory_visible: directoryVisible,
        show_email: showEmail,
        show_phone: showPhone,
        show_photo: showPhoto,
      })
      .eq('id', user.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    await refreshProfile();
    router.push('/onboarding/household');
  }

  return (
    <Screen>
      <View style={styles.wrap}>
        <AppText variant="title">Privacy</AppText>
        <AppText muted>
          You control whether you appear in the member directory and which
          details others can see.
        </AppText>

        <PrivacyToggles
          directoryVisible={directoryVisible}
          showEmail={showEmail}
          showPhone={showPhone}
          showPhoto={showPhoto}
          onChange={(next) => {
            setDirectoryVisible(next.directoryVisible);
            setShowEmail(next.showEmail);
            setShowPhone(next.showPhone);
            setShowPhoto(next.showPhoto);
          }}
        />

        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button label="Continue" loading={saving} onPress={onContinue} />
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
});
