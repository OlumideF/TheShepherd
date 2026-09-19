import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { expandOccurrences, endOfMonth, startOfMonth } from '@/features/events/utils/recurrence';
import { supabase } from '@/lib/supabase/client';
import type {
  ChurchEvent,
  ChurchGroup,
  EventRsvp,
  RsvpStatus,
  VolunteerSignup,
  VolunteerSlot,
} from '@/lib/supabase/types';

export type EventWithMeta = ChurchEvent & {
  groups?: Pick<ChurchGroup, 'id' | 'name'> | null;
};

export function useEventsForMonth(month: Date) {
  const from = startOfMonth(month);
  const to = endOfMonth(month);

  return useQuery({
    queryKey: ['events-month', from.toISOString().slice(0, 7)],
    queryFn: async () => {
      // Load published series + near-term singles; expand RRULEs client-side.
      const { data, error } = await supabase
        .from('events')
        .select('*, groups(id, name)')
        .eq('published', true)
        .order('starts_at', { ascending: true })
        .limit(300);

      if (error) throw error;
      const events = (data ?? []) as EventWithMeta[];
      return expandOccurrences(events, from, to);
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<EventWithMeta | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('events')
        .select('*, groups(id, name)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as EventWithMeta | null;
    },
  });
}

export function useOccurrenceRsvps(eventId: string | undefined, occurrenceStart: string | undefined) {
  return useQuery({
    queryKey: ['event-rsvps', eventId, occurrenceStart],
    enabled: Boolean(eventId && occurrenceStart),
    queryFn: async (): Promise<EventRsvp[]> => {
      if (!eventId || !occurrenceStart) return [];
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('*')
        .eq('event_id', eventId)
        .eq('occurrence_start', occurrenceStart);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyRsvp(
  eventId: string | undefined,
  occurrenceStart: string | undefined,
  profileId: string | undefined,
) {
  const { data: rsvps = [], ...rest } = useOccurrenceRsvps(eventId, occurrenceStart);
  const mine = rsvps.find((r) => r.profile_id === profileId) ?? null;
  const goingCount = rsvps.filter((r) => r.status === 'going').length;
  const waitlistCount = rsvps.filter((r) => r.status === 'waitlisted').length;
  return { ...rest, rsvps, mine, goingCount, waitlistCount };
}

export function useUpsertRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      eventId: string;
      occurrenceStart: string;
      status: Exclude<RsvpStatus, 'waitlisted'>;
    }) => {
      const { data, error } = await supabase.rpc('upsert_event_rsvp', {
        p_event_id: args.eventId,
        p_occurrence_start: args.occurrenceStart,
        p_status: args.status,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['event-rsvps', vars.eventId] });
    },
  });
}

export function useVolunteerSlots(eventId: string | undefined) {
  return useQuery({
    queryKey: ['volunteer-slots', eventId],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<VolunteerSlot[]> => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('volunteer_slots')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVolunteerSignups(
  slotIds: string[],
  occurrenceStart: string | undefined,
) {
  return useQuery({
    queryKey: ['volunteer-signups', slotIds, occurrenceStart],
    enabled: slotIds.length > 0 && Boolean(occurrenceStart),
    queryFn: async (): Promise<VolunteerSignup[]> => {
      if (!occurrenceStart || slotIds.length === 0) return [];
      const { data, error } = await supabase
        .from('volunteer_signups')
        .select('*')
        .in('slot_id', slotIds)
        .eq('occurrence_start', occurrenceStart);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { slotId: string; occurrenceStart: string }) => {
      const { data, error } = await supabase.rpc('toggle_volunteer_signup', {
        p_slot_id: args.slotId,
        p_occurrence_start: args.occurrenceStart,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-signups'] });
    },
  });
}

export function useLedGroups(profileId: string | undefined) {
  return useQuery({
    queryKey: ['led-groups', profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<ChurchGroup[]> => {
      if (!profileId) return [];
      const { data: memberships, error: mErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('profile_id', profileId)
        .eq('status', 'approved')
        .eq('role_in_group', 'leader');
      if (mErr) throw mErr;
      const ids = (memberships ?? []).map((m) => m.group_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from('groups').select('*').in('id', ids);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: DatabaseInsertEvent & { volunteerSlots?: { title: string; slots_needed: number }[] },
    ) => {
      const { volunteerSlots, ...row } = input;
      const { data, error } = await supabase.from('events').insert(row).select('*').single();
      if (error) throw error;

      if (volunteerSlots?.length) {
        const { error: slotErr } = await supabase.from('volunteer_slots').insert(
          volunteerSlots.map((s) => ({
            event_id: data.id,
            title: s.title,
            slots_needed: s.slots_needed,
          })),
        );
        if (slotErr) throw slotErr;
      }
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events-month'] });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; patch: DatabaseUpdateEvent }) => {
      const { data, error } = await supabase
        .from('events')
        .update(args.patch)
        .eq('id', args.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['events-month'] });
      void qc.invalidateQueries({ queryKey: ['event', data.id] });
    },
  });
}

type DatabaseInsertEvent = {
  title: string;
  description?: string | null;
  kind?: ChurchEvent['kind'];
  location?: string | null;
  starts_at: string;
  ends_at?: string | null;
  timezone?: string;
  rrule?: string | null;
  capacity?: number | null;
  group_id?: string | null;
  created_by: string;
  reminder_offsets_minutes?: number[];
  published?: boolean;
};

type DatabaseUpdateEvent = Partial<Omit<DatabaseInsertEvent, 'created_by'>>;

export function canCreateEvents(role: string | undefined): boolean {
  return role === 'admin' || role === 'group_leader';
}
