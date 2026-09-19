import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import {
  useDeletePrayerRequest,
  type PrayerRequestWithMeta,
} from '@/features/communication/hooks/usePrayer';
import { colors, radii, spacing } from '@/constants/theme';

type PrayerCardProps = {
  request: PrayerRequestWithMeta;
  currentProfileId: string | undefined;
};

export function PrayerCard({ request, currentProfileId }: PrayerCardProps) {
  const remove = useDeletePrayerRequest();
  const isMine = currentProfileId === request.author_id;
  const authorLabel = request.is_anonymous
    ? 'Anonymous'
    : request.author_display_name || 'Member';

  const visibilityLabel =
    request.visibility === 'public'
      ? 'Public'
      : request.visibility === 'private'
        ? 'Private'
        : `Group · ${request.groups?.name ?? 'ministry'}`;

  return (
    <View style={styles.card}>
      <View style={styles.meta}>
        <AppText variant="caption" muted>
          {authorLabel} · {visibilityLabel}
        </AppText>
        <AppText variant="caption" muted>
          {new Date(request.created_at).toLocaleDateString()}
        </AppText>
      </View>
      <AppText>{request.body}</AppText>
      {isMine ? (
        <Button
          label="Remove"
          variant="ghost"
          loading={remove.isPending}
          onPress={() => remove.mutate(request.id)}
        />
      ) : null}
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
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
