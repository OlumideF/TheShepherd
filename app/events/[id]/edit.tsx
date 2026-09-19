import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { useEvent, useUpdateEvent } from '@/features/events/hooks/useEvents';
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

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseLocalInput(value: string): Date | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(id);
  const update = useUpdateEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [kind, setKind] = useState<EventKind>('special');
  const [startsLocal, setStartsLocal] = useState('');
  const [endsLocal, setEndsLocal] = useState('');
  const [rrule, setRrule] = useState('');
  const [capacity, setCapacity] = useState('');
  const [published, setPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!event || ready) return;
    setTitle(event.title);
    setDescription(event.description ?? '');
    setLocation(event.location ?? '');
    setKind(event.kind);
    setStartsLocal(toLocalInputValue(event.starts_at));
    setEndsLocal(event.ends_at ? toLocalInputValue(event.ends_at) : '');
    setRrule(event.rrule ?? '');
    setCapacity(event.capacity != null ? String(event.capacity) : '');
    setPublished(event.published);
    setReady(true);
  }, [event, ready]);

  if (isLoading || !ready) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Edit event' }} />
        <AppText muted>Loading…</AppText>
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Edit event' }} />
        <AppText color={colors.danger}>Event not found.</AppText>
      </Screen>
    );
  }

  const onSubmit = () => {
    setError(null);
    const starts = parseLocalInput(startsLocal);
    if (!title.trim() || !starts) {
      setError('Title and start are required.');
      return;
    }
    const ends = endsLocal.trim() ? parseLocalInput(endsLocal) : null;
    const rruleBody = rrule.trim().replace(/^RRULE:/i, '');
    if (rruleBody) {
      const rruleErr = validateRrule(rruleBody);
      if (rruleErr) {
        setError(rruleErr);
        return;
      }
    }
    const cap = capacity.trim() ? Number(capacity) : null;

    update.mutate(
      {
        id: event.id,
        patch: {
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          kind,
          starts_at: starts.toISOString(),
          ends_at: ends ? ends.toISOString() : null,
          timezone: EVENT_TIMEZONE,
          rrule: rruleBody || null,
          capacity: cap,
          published,
        },
      },
      {
        onSuccess: () => router.back(),
        onError: (e) => {
          const msg = e instanceof Error ? e.message : 'Update failed.';
          setError(msg);
          Alert.alert('Update failed', msg);
        },
      },
    );
  };

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit event' }} />
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
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[styles.chip, kind === k && styles.chipActive]}
            >
              <AppText variant="bodyStrong" color={kind === k ? '#fff' : colors.ink}>
                {KIND_LABELS[k]}
              </AppText>
            </Pressable>
          ))}
        </View>

        <TextField
          label="Starts (local YYYY-MM-DDTHH:mm)"
          value={startsLocal}
          onChangeText={setStartsLocal}
          autoCapitalize="none"
        />
        <TextField
          label="Ends (optional)"
          value={endsLocal}
          onChangeText={setEndsLocal}
          autoCapitalize="none"
        />
        <TextField
          label="RRULE (optional iCal)"
          value={rrule}
          onChangeText={setRrule}
          autoCapitalize="characters"
        />
        <TextField
          label="Capacity (optional)"
          value={capacity}
          onChangeText={setCapacity}
          keyboardType="number-pad"
        />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: published }}
          onPress={() => setPublished((p) => !p)}
          style={styles.checkRow}
        >
          <AppText variant="bodyStrong">
            {published ? 'Published' : 'Unpublished (hidden from members)'}
          </AppText>
        </Pressable>

        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button label="Save changes" loading={update.isPending} onPress={onSubmit} />
      </ScrollView>
    </Screen>
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
  checkRow: {
    paddingVertical: spacing.sm,
  },
});
