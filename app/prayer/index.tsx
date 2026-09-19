import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { PrayerCard } from '@/features/communication/components/PrayerCard';
import { PrayerCompose } from '@/features/communication/components/PrayerCompose';
import { usePrayerWall } from '@/features/communication/hooks/usePrayer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { colors, spacing } from '@/constants/theme';

export default function PrayerWallScreen() {
  const { profile, user } = useAuth();
  const profileId = profile?.id ?? user?.id;
  const { data = [], isLoading, error } = usePrayerWall();

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <AppText variant="title">Prayer wall</AppText>
          <AppText muted>
            Share requests privately, with a group, or on the public wall.
          </AppText>
        </View>

        {profileId ? <PrayerCompose profileId={profileId} /> : null}

        <AppText variant="heading">Requests</AppText>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : error ? (
          <AppText color={colors.danger}>Could not load prayer requests.</AppText>
        ) : data.length === 0 ? (
          <AppText muted>No prayer requests yet.</AppText>
        ) : (
          <View style={styles.list}>
            {data.map((request) => (
              <PrayerCard
                key={request.id}
                request={request}
                currentProfileId={profileId}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
});
