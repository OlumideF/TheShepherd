import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  canCreateEvents,
  useCreateEvent,
  useLedGroups,
} from '@/features/events/hooks/useEvents';
import {
  EVENT_TIMEZONE,
  KIND_LABELS,
  validateRrule,
} from '@/features/events/utils/recurrence';
import type { EventKind } from '@/lib/supabase/types';

const KINDS = Object.keys(KIND_LABELS) as EventKind[];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseLocalInput(value: string): Date | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function CreateEventScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const create = useCreateEvent();
  const { data: ledGroups = [] } = useLedGroups(profile?.id);
  const isAdmin = profile?.role === 'admin';

  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  }, []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [kind, setKind] = useState<EventKind>('special');
  const [startsLocal, setStartsLocal] = useState(toLocalInputValue(defaultStart));
  const [endsLocal, setEndsLocal] = useState('');
  const [rrule, setRrule] = useState('');
  const [capacity, setCapacity] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [volunteerTitle, setVolunteerTitle] = useState('');
  const [volunteerNeeded, setVolunteerNeeded] = useState('1');
  const [error, setError] = useState<string | null>(null);

  if (!canCreateEvents(profile?.role)) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'New event' }} />
        <AppText color={colors.danger}>
          Only admins and group leaders can create events.
        </AppText>
      </Screen>
    );
  }

  if (!isAdmin && ledGroups.length === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'New event' }} />
        <AppText>
          You’re a group leader, but you’re not marked as a leader on any group yet.
          Ask an admin to add you as a group leader (Phase 6 will add self-serve
          roster tools).
        </AppText>
      </Screen>
    );
  }

  const onSubmit = () => {
    setError(null);
    const starts = parseLocalInput(startsLocal);
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!starts) {
      setError('Start date/time is required (YYYY-MM-DDTHH:mm).');
      return;
    }
    const ends = endsLocal.trim() ? parseLocalInput(endsLocal) : null;
    if (endsLocal.trim() && !ends) {
      setError('End date/time is invalid.');
      return;
    }
    if (ends && ends < starts) {
      setError('End must be after start.');
      return;
    }

    const rruleBody = rrule.trim().replace(/^RRULE:/i, '');
    if (rruleBody) {
      const rruleErr = validateRrule(rruleBody);
      if (rruleErr) {
        setError(rruleErr);
        return;
      }
    }

    const cap = capacity.trim() ? Number(capacity) : null;
    if (cap != null && (!Number.isFinite(cap) || cap < 1)) {
      setError('Capacity must be a positive number.');
      return;
    }

    let resolvedGroupId: string | null = groupId;
    if (!isAdmin) {
      resolvedGroupId = groupId ?? ledGroups[0]?.id ?? null;
      if (!resolvedGroupId) {
        setError('Select a group you lead.');
        return;
      }
    }

    const slots =
      volunteerTitle.trim().length > 0
        ? [
            {
              title: volunteerTitle.trim(),
              slots_needed: Math.max(1, Number(volunteerNeeded) || 1),
            },
          ]
        : undefined;

    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        kind,
        starts_at: starts.toISOString(),
        ends_at: ends ? ends.toISOString() : null,
        timezone: EVENT_TIMEZONE,
        rrule: rruleBody || null,
        capacity: cap,
        group_id: resolvedGroupId,
        created_by: profile!.id,
        reminder_offsets_minutes: [1440, 60],
        published: true,
        volunteerSlots: slots,
      },
      {
        onSuccess: (event) => {
          router.replace(
            `/events/${event.id}?at=${encodeURIComponent(event.starts_at)}` as Href,
          );
        },
        onError: (e) => {
          const msg = e instanceof Error ? e.message : 'Could not create event.';
          setError(msg);
          Alert.alert('Create failed', msg);
        },
      },
    );
  };

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'New event' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          style={styles.multiline}
        />
        <TextField label="Location" value={location} onChangeText={setLocation} />

        <AppText variant="label" color={colors.inkMuted}>
          Kind
        </AppText>
        <View style={styles.chips}>
          {KINDS.map((k) => (
            <Chip
              key={k}
              label={KIND_LABELS[k]}
              active={kind === k}
              onPress={() => setKind(k)}
            />
          ))}
        </View>

        <TextField
          label="Starts (local YYYY-MM-DDTHH:mm)"
          value={startsLocal}
          onChangeText={setStartsLocal}
          autoCapitalize="none"
          placeholder="2026-09-20T10:00"
        />
        <TextField
          label="Ends (optional)"
          value={endsLocal}
          onChangeText={setEndsLocal}
          autoCapitalize="none"
          placeholder="2026-09-20T12:00"
        />
        <TextField
          label="RRULE (optional iCal)"
          value={rrule}
          onChangeText={setRrule}
          autoCapitalize="characters"
          placeholder="FREQ=WEEKLY;BYDAY=SU"
        />
        <AppText variant="caption" muted>
          Timezone: {EVENT_TIMEZONE}. Example: FREQ=WEEKLY;BYDAY=SU or
          FREQ=MONTHLY;BYMONTHDAY=1
        </AppText>

        <TextField
          label="Capacity (optional)"
          value={capacity}
          onChangeText={setCapacity}
          keyboardType="number-pad"
          placeholder="Leave blank for unlimited"
        />

        {(isAdmin ? ledGroups.length > 0 : true) && ledGroups.length > 0 ? (
          <>
            <AppText variant="label" color={colors.inkMuted}>
              {isAdmin ? 'Group (optional)' : 'Group (required)'}
            </AppText>
            <View style={styles.chips}>
              {isAdmin ? (
                <Chip
                  label="None"
                  active={groupId == null}
                  onPress={() => setGroupId(null)}
                />
              ) : null}
              {ledGroups.map((g) => (
                <Chip
                  key={g.id}
                  label={g.name}
                  active={groupId === g.id}
                  onPress={() => setGroupId(g.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        <AppText variant="heading">Volunteer slot (optional)</AppText>
        <TextField
          label="Slot title"
          value={volunteerTitle}
          onChangeText={setVolunteerTitle}
          placeholder="Usher"
        />
        <TextField
          label="Slots needed"
          value={volunteerNeeded}
          onChangeText={setVolunteerNeeded}
          keyboardType="number-pad"
        />

        {error ? <AppText color={colors.danger}>{error}</AppText> : null}

        <Button label="Publish event" loading={create.isPending} onPress={onSubmit} />
      </ScrollView>
    </Screen>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <AppText variant="bodyStrong" color={active ? '#fff' : colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
});
