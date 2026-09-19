import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { spacing } from '@/constants/theme';

export default function OnboardingWelcome() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.wrap}>
        <BrandMark size="md" />
        <AppText variant="title">Welcome</AppText>
        <AppText muted style={styles.body}>
          A few quick steps to set up your profile, privacy, and household so
          you can connect with the congregation.
        </AppText>
        <Button label="Get started" onPress={() => router.push('/onboarding/profile')} />
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
  body: {
    maxWidth: 360,
    marginBottom: spacing.md,
  },
});
