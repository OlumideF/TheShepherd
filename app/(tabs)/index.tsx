import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SocialLinks } from '@/components/ui/SocialLinks';
import { brand } from '@/constants/brand';
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
        <AppText variant="heading">Find people</AppText>
        <AppText muted style={styles.body}>
          Browse members who opted into the directory, or update your own
          privacy and household from Profile.
        </AppText>
        <Link href="/(tabs)/directory" asChild>
          <Button label="Open directory" variant="secondary" />
        </Link>
      </View>

      <View style={styles.card}>
        <AppText variant="heading">Watch live</AppText>
        <AppText muted style={styles.body}>
          Sunday services stream on YouTube ({brand.liveSchedule.label}).
        </AppText>
        <Link href="/(tabs)/media" asChild>
          <Button label="Go to Media" variant="secondary" />
        </Link>
      </View>

      <View style={styles.card}>
        <AppText variant="heading">Connect</AppText>
        <AppText muted style={styles.body}>
          {brand.social.instagram.name} on social media.
        </AppText>
        <SocialLinks />
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
    marginBottom: spacing.md,
  },
  body: {
    maxWidth: 420,
    marginBottom: spacing.sm,
  },
});
