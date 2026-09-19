import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import type {
  Announcement,
  AnnouncementComment,
  GroupMessage,
  PrayerRequest,
} from '@/lib/supabase/types';

export function useModerationAnnouncements(enabled: boolean) {
  return useQuery({
    queryKey: ['moderation-announcements'],
    enabled,
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useModerationComments(enabled: boolean) {
  return useQuery({
    queryKey: ['moderation-comments'],
    enabled,
    queryFn: async (): Promise<AnnouncementComment[]> => {
      const { data, error } = await supabase
        .from('announcement_comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useModerationPrayers(enabled: boolean) {
  return useQuery({
    queryKey: ['moderation-prayers'],
    enabled,
    queryFn: async (): Promise<PrayerRequest[]> => {
      const { data, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useModerationGroupMessages(enabled: boolean) {
  return useQuery({
    queryKey: ['moderation-group-messages'],
    enabled,
    queryFn: async (): Promise<GroupMessage[]> => {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['moderation-announcements'] });
      await qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcement_comments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['moderation-comments'] });
      await qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useDeletePrayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prayer_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['moderation-prayers'] });
      await qc.invalidateQueries({ queryKey: ['prayer-requests'] });
    },
  });
}

export function useDeleteGroupMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('group_messages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['moderation-group-messages'] });
      await qc.invalidateQueries({ queryKey: ['group-messages'] });
    },
  });
}
