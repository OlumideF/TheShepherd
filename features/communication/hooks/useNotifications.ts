import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import type {
  AppNotification,
  Broadcast,
  ChurchGroup,
  NotificationPreferences,
} from '@/lib/supabase/types';

export function useNotificationPreferences(profileId: string | undefined) {
  return useQuery({
    queryKey: ['notification-preferences', profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<NotificationPreferences | null> => {
      if (!profileId) return null;
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      profileId: string;
      patch: Partial<
        Pick<
          NotificationPreferences,
          'announcements' | 'events' | 'broadcasts' | 'prayer'
        >
      >;
    }) => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          profile_id: args.profileId,
          ...args.patch,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({
        queryKey: ['notification-preferences', vars.profileId],
      });
    },
  });
}

export function useNotifications(profileId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<AppNotification[]> => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('profile_id', profileId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      title: string;
      body: string;
      groupId: string;
      authorId: string;
    }) => {
      const { data, error } = await supabase
        .from('broadcasts')
        .insert({
          title: args.title.trim(),
          body: args.body.trim(),
          group_id: args.groupId,
          author_id: args.authorId,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as Broadcast;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      await qc.invalidateQueries({ queryKey: ['broadcasts'] });
      void supabase.functions.invoke('send-push').catch(() => undefined);
    },
  });
}

export function useLeadableGroups(profileId: string | undefined, isAdmin: boolean) {
  return useQuery({
    queryKey: ['leadable-groups', profileId, isAdmin],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<Pick<ChurchGroup, 'id' | 'name'>[]> => {
      if (!profileId) return [];

      if (isAdmin) {
        const { data, error } = await supabase
          .from('groups')
          .select('id, name')
          .eq('published', true)
          .order('name');
        if (error) throw error;
        return data ?? [];
      }

      const { data, error } = await supabase
        .from('group_members')
        .select('groups(id, name)')
        .eq('profile_id', profileId)
        .eq('status', 'approved')
        .eq('role_in_group', 'leader');
      if (error) throw error;
      return (data ?? [])
        .map((row) => row.groups as unknown as Pick<ChurchGroup, 'id' | 'name'> | null)
        .filter((g): g is Pick<ChurchGroup, 'id' | 'name'> => Boolean(g));
    },
  });
}
