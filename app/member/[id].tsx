import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { useDirectoryMember } from '@/features/members/hooks/useDirectory';

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, error } = useDirectoryMember(id);

  const name =
    data?.display_name ||
    [data?.first_name, data?.last_name].filter(Boolean).join(' ') ||
    'Member';

  return (
    <Screen>
      <Stack.Screen options={{ title: name, headerShown: true }} />

      {isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : isError || !data ? (
        <AppText color={colors.danger}>
          {error instanceof Error ? error.message : 'Member not found.'}
        </AppText>
      ) : (
        <View style={styles.card}>
          <AppText variant="title">{name}</AppText>
          <AppText muted style={styles.status}>
            {data.membership_status}
          </AppText>
          {data.email ? (
            <Detail label="Email" value={data.email} />
          ) : null}
          {data.phone ? (
            <Detail label="Phone" value={data.phone} />
          ) : null}
          {!data.email && !data.phone ? (
            <AppText muted>No contact details shared.</AppText>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  status: {
    textTransform: 'capitalize',
    marginBottom: spacing.sm,
  },
  detail: {
    gap: 2,
  },
});
