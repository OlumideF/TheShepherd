import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { EventListItem } from '@/features/events/components/EventListItem';
import { MonthCalendar } from '@/features/events/components/MonthCalendar';
import { canCreateEvents, useEventsForMonth } from '@/features/events/hooks/useEvents';
import { isSameDay, startOfDay, toIso } from '@/features/events/utils/recurrence';

export default function EventsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [month, setMonth] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));

  const { data: occurrences = [], isLoading, isError, error } = useEventsForMonth(month);

  const dayEvents = useMemo(
    () => occurrences.filter((o) => isSameDay(o.occurrenceStart, selected)),
    [occurrences, selected],
  );

  const showCreate = canCreateEvents(profile?.role);

  return (
    <Screen padded={false}>
      <FlatList
        data={dayEvents}
        keyExtractor={(item) =>
          `${item.event.id}-${item.occurrenceStart.toISOString()}`
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <AppText variant="title">Events</AppText>
                <AppText muted>Services, groups, and special gatherings.</AppText>
              </View>
              {showCreate ? (
                <Button
                  label="New"
                  variant="secondary"
                  onPress={() => router.push('/events/create' as Href)}
                />
              ) : null}
            </View>

            <MonthCalendar
              month={month}
              selected={selected}
              occurrences={occurrences}
              onSelectDay={setSelected}
              onChangeMonth={(m) => {
                setMonth(m);
                setSelected(startOfDay(m));
              }}
            />

            <AppText variant="heading" style={styles.dayHeading}>
              {selected.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </AppText>

            {isLoading ? (
              <ActivityIndicator color={colors.accent} style={styles.loader} />
            ) : null}
            {isError ? (
              <AppText color={colors.danger}>
                {error instanceof Error ? error.message : 'Could not load events.'}
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !isError ? (
            <AppText muted style={styles.empty}>
              No events on this day.
            </AppText>
          ) : null
        }
        renderItem={({ item }) => (
          <EventListItem
            occurrence={item}
            onPress={() => {
              const at = encodeURIComponent(toIso(item.occurrenceStart));
              router.push(`/events/${item.event.id}?at=${at}` as Href);
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  dayHeading: {
    marginTop: spacing.sm,
  },
  loader: {
    marginVertical: spacing.md,
  },
  empty: {
    marginTop: spacing.sm,
  },
});
