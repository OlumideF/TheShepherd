import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing } from '@/constants/theme';
import {
  formatEventWhen,
  KIND_LABELS,
  type EventOccurrence,
} from '@/features/events/utils/recurrence';

type EventListItemProps = {
  occurrence: EventOccurrence;
  onPress: () => void;
};

export function EventListItem({ occurrence, onPress }: EventListItemProps) {
  const { event, occurrenceStart, occurrenceEnd } = occurrence;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={event.title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.accent} />
      <View style={styles.body}>
        <AppText variant="bodyStrong">{event.title}</AppText>
        <AppText variant="caption" muted>
          {formatEventWhen(occurrenceStart, occurrenceEnd, event.timezone)}
        </AppText>
        <View style={styles.meta}>
          <AppText variant="caption" color={colors.accent}>
            {KIND_LABELS[event.kind]}
          </AppText>
          {event.location ? (
            <AppText variant="caption" muted numberOfLines={1}>
              · {event.location}
            </AppText>
          ) : null}
          {event.rrule ? (
            <AppText variant="caption" muted>
              · Recurring
            </AppText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    minHeight: 72,
  },
  pressed: {
    opacity: 0.9,
  },
  accent: {
    width: 4,
    backgroundColor: colors.accent,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
});
