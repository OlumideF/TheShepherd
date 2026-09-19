import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing } from '@/constants/theme';
import type { EventRsvp, RsvpStatus } from '@/lib/supabase/types';

type RsvpPanelProps = {
  mine: EventRsvp | null;
  goingCount: number;
  waitlistCount: number;
  capacity: number | null;
  loading?: boolean;
  onSelect: (status: Exclude<RsvpStatus, 'waitlisted'>) => void;
};

const OPTIONS: { status: Exclude<RsvpStatus, 'waitlisted'>; label: string }[] = [
  { status: 'going', label: 'Going' },
  { status: 'maybe', label: 'Maybe' },
  { status: 'not_going', label: 'Not going' },
];

export function RsvpPanel({
  mine,
  goingCount,
  waitlistCount,
  capacity,
  loading,
  onSelect,
}: RsvpPanelProps) {
  const spotsLeft =
    capacity == null ? null : Math.max(0, capacity - goingCount);

  return (
    <View style={styles.root}>
      <AppText variant="heading">RSVP</AppText>
      <AppText muted>
        {capacity == null
          ? `${goingCount} going`
          : spotsLeft === 0
            ? `Full · ${goingCount}/${capacity} · ${waitlistCount} waitlisted`
            : `${goingCount}/${capacity} going · ${spotsLeft} left`}
      </AppText>

      {mine?.status === 'waitlisted' ? (
        <View style={styles.waitlistBanner}>
          <AppText variant="bodyStrong" color={colors.brand}>
            You’re on the waitlist
            {mine.waitlist_position ? ` (#${mine.waitlist_position})` : ''}
          </AppText>
          <AppText variant="caption" muted>
            You’ll move up if a spot opens.
          </AppText>
        </View>
      ) : null}

      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active = mine?.status === opt.status;
          return (
            <Button
              key={opt.status}
              label={opt.label}
              variant={active ? 'primary' : 'ghost'}
              loading={loading && active}
              disabled={loading}
              onPress={() => onSelect(opt.status)}
              style={styles.btn}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  btn: {
    flexGrow: 1,
  },
  waitlistBanner: {
    padding: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    gap: 2,
  },
});
