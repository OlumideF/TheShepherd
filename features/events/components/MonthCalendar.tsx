import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing, touchTarget } from '@/constants/theme';
import {
  buildMonthGrid,
  formatMonthYear,
  isSameDay,
  startOfMonth,
} from '@/features/events/utils/recurrence';
import type { EventOccurrence } from '@/features/events/utils/recurrence';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type MonthCalendarProps = {
  month: Date;
  selected: Date;
  occurrences: EventOccurrence[];
  onSelectDay: (day: Date) => void;
  onChangeMonth: (month: Date) => void;
};

export function MonthCalendar({
  month,
  selected,
  occurrences,
  onSelectDay,
  onChangeMonth,
}: MonthCalendarProps) {
  const grid = buildMonthGrid(month);
  const monthStart = startOfMonth(month);
  const today = new Date();

  const daysWithEvents = new Set(
    occurrences.map((o) => {
      const d = o.occurrenceStart;
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() =>
            onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
          style={styles.navBtn}
        >
          <AppText variant="heading">‹</AppText>
        </Pressable>
        <AppText variant="heading">{formatMonthYear(month)}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() =>
            onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
          style={styles.navBtn}
        >
          <AppText variant="heading">›</AppText>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <AppText key={d} variant="caption" muted style={styles.weekday}>
            {d}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((day) => {
          const inMonth = day.getMonth() === monthStart.getMonth();
          const selectedDay = isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const hasEvents = daysWithEvents.has(key);

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedDay }}
              accessibilityLabel={day.toDateString()}
              onPress={() => onSelectDay(day)}
              style={[
                styles.cell,
                selectedDay && styles.cellSelected,
                isToday && !selectedDay && styles.cellToday,
              ]}
            >
              <AppText
                variant="bodyStrong"
                color={
                  selectedDay
                    ? '#fff'
                    : inMonth
                      ? colors.ink
                      : colors.inkSubtle
                }
              >
                {day.getDate()}
              </AppText>
              {hasEvents ? (
                <View
                  style={[
                    styles.dot,
                    selectedDay && styles.dotOnSelected,
                  ]}
                />
              ) : (
                <View style={styles.dotPlaceholder} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    minWidth: touchTarget,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    gap: 2,
  },
  cellSelected: {
    backgroundColor: colors.brand,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  dotOnSelected: {
    backgroundColor: '#fff',
  },
  dotPlaceholder: {
    width: 5,
    height: 5,
  },
});
