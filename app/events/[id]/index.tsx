import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { RsvpPanel } from '@/features/events/components/RsvpPanel';
import { VolunteerSlotsPanel } from '@/features/events/components/VolunteerSlotsPanel';
import {
  useEvent,
  useMyRsvp,
  useToggleVolunteer,
  useUpsertRsvp,
  useVolunteerSignups,
  useVolunteerSlots,
} from '@/features/events/hooks/useEvents';
import {
  formatEventWhen,
  KIND_LABELS,
  toIso,
} from '@/features/events/utils/recurrence';

export default function EventDetailScreen() {
  const { id, at } = useLocalSearchParams<{ id: string; at?: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { data: event, isLoading, isError, error } = useEvent(id);

  const occurrenceStart = useMemo(() => {
    if (at) {
      const decoded = decodeURIComponent(at);
      const d = new Date(decoded);
      if (!Number.isNaN(d.getTime())) return d;
    }
    if (event?.starts_at) return new Date(event.starts_at);
    return null;
  }, [at, event?.starts_at]);

  const occurrenceIso = occurrenceStart ? toIso(occurrenceStart) : undefined;
  const durationMs =
    event?.ends_at && event?.starts_at
      ? new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()
      : null;
  const occurrenceEnd =
    occurrenceStart && durationMs != null
      ? new Date(occurrenceStart.getTime() + durationMs)
      : event?.ends_at
        ? new Date(event.ends_at)
        : null;

  const { mine, goingCount, waitlistCount, isLoading: rsvpLoading } = useMyRsvp(
    id,
    occurrenceIso,
    profile?.id,
  );
  const upsert = useUpsertRsvp();
  const { data: slots = [] } = useVolunteerSlots(id);
  const slotIds = slots.map((s) => s.id);
  const { data: signups = [] } = useVolunteerSignups(slotIds, occurrenceIso);
  const toggleVol = useToggleVolunteer();
  const [loadingSlotId, setLoadingSlotId] = useState<string | null>(null);

  const canManage =
    profile?.role === 'admin' ||
    event?.created_by === profile?.id ||
    (profile?.role === 'group_leader' && event?.group_id != null);

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: event?.title ?? 'Event',
        }}
      />

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : isError || !event || !occurrenceStart ? (
        <View style={styles.pad}>
          <AppText color={colors.danger}>
            {error instanceof Error ? error.message : 'Event not found.'}
          </AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <AppText variant="title">{event.title}</AppText>
          <AppText muted>
            {formatEventWhen(occurrenceStart, occurrenceEnd, event.timezone)}
          </AppText>
          <AppText variant="caption" color={colors.accent}>
            {KIND_LABELS[event.kind]}
            {event.groups?.name ? ` · ${event.groups.name}` : ''}
            {event.rrule ? ' · Recurring' : ''}
          </AppText>
          {event.location ? <AppText>{event.location}</AppText> : null}
          {event.description ? <AppText muted>{event.description}</AppText> : null}

          {event.reminder_offsets_minutes?.length ? (
            <AppText variant="caption" muted>
              Reminders:{' '}
              {event.reminder_offsets_minutes
                .map((m) => (m >= 60 ? `${m / 60}h` : `${m}m`))
                .join(', ')}{' '}
              before (queued; push delivery in Phase 5)
            </AppText>
          ) : null}

          <RsvpPanel
            mine={mine}
            goingCount={goingCount}
            waitlistCount={waitlistCount}
            capacity={event.capacity}
            loading={upsert.isPending || rsvpLoading}
            onSelect={(status) => {
              upsert.mutate(
                {
                  eventId: event.id,
                  occurrenceStart: occurrenceIso!,
                  status,
                },
                {
                  onError: (e) => {
                    Alert.alert(
                      'RSVP failed',
                      e instanceof Error ? e.message : 'Try again.',
                    );
                  },
                },
              );
            }}
          />

          <VolunteerSlotsPanel
            slots={slots}
            signups={signups}
            profileId={profile?.id}
            loadingSlotId={loadingSlotId}
            onToggle={(slotId) => {
              setLoadingSlotId(slotId);
              toggleVol.mutate(
                { slotId, occurrenceStart: occurrenceIso! },
                {
                  onSettled: () => setLoadingSlotId(null),
                  onError: (e) => {
                    Alert.alert(
                      'Volunteer signup failed',
                      e instanceof Error ? e.message : 'Try again.',
                    );
                  },
                },
              );
            }}
          />

          {canManage ? (
            <Button
              label="Edit event"
              variant="ghost"
              onPress={() => router.push(`/events/${event.id}/edit` as Href)}
            />
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: spacing.xl,
  },
  pad: {
    padding: spacing.lg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
