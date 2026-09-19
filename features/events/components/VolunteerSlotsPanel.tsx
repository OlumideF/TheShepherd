import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing } from '@/constants/theme';
import type { VolunteerSignup, VolunteerSlot } from '@/lib/supabase/types';

type VolunteerSlotsPanelProps = {
  slots: VolunteerSlot[];
  signups: VolunteerSignup[];
  profileId: string | undefined;
  loadingSlotId?: string | null;
  onToggle: (slotId: string) => void;
};

export function VolunteerSlotsPanel({
  slots,
  signups,
  profileId,
  loadingSlotId,
  onToggle,
}: VolunteerSlotsPanelProps) {
  if (slots.length === 0) return null;

  return (
    <View style={styles.root}>
      <AppText variant="heading">Volunteer</AppText>
      <AppText muted>Sign up to serve at this event.</AppText>
      {slots.map((slot) => {
        const slotSignups = signups.filter((s) => s.slot_id === slot.id);
        const mine = slotSignups.some((s) => s.profile_id === profileId);
        const full = slotSignups.length >= slot.slots_needed && !mine;

        return (
          <View key={slot.id} style={styles.card}>
            <View style={styles.cardBody}>
              <AppText variant="bodyStrong">{slot.title}</AppText>
              {slot.description ? (
                <AppText variant="caption" muted>
                  {slot.description}
                </AppText>
              ) : null}
              <AppText variant="caption" color={colors.accent}>
                {slotSignups.length}/{slot.slots_needed} filled
              </AppText>
            </View>
            <Button
              label={mine ? 'Leave' : full ? 'Full' : 'Sign up'}
              variant={mine ? 'secondary' : 'ghost'}
              disabled={full || loadingSlotId === slot.id}
              loading={loadingSlotId === slot.id}
              onPress={() => onToggle(slot.id)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
});
