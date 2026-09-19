import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BrandMark } from '@/components/ui/BrandMark';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const name =
    profile?.display_name ||
    profile?.first_name ||
    user?.email?.split('@')[0] ||
    'friend';

  return (
    <Screen>
      <View style={styles.hero}>
        <BrandMark size="sm" />
        <AppText muted>Welcome back, {name}.</AppText>
      </View>

      <View style={styles.card}>
        <AppText variant="heading">Foundation ready</AppText>
        <AppText muted style={styles.body}>
          Phase 1 is in place: auth, profiles, roles, and this navigation shell.
          Media, events, groups, and communication land in later phases.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  body: {
    maxWidth: 420,
  },
});
