import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import type { ChurchGroup, PrayerRequest, PrayerVisibility } from '@/lib/supabase/types';

export type PrayerRequestWithMeta = PrayerRequest & {
  groups: Pick<ChurchGroup, 'id' | 'name'> | null;
};

export function usePrayerWall() {
  return useQuery({
    queryKey: ['prayer-requests'],
    queryFn: async (): Promise<PrayerRequestWithMeta[]> => {
      const { data, error } = await supabase
        .from('prayer_requests')
        .select(
          `
          *,
          groups(id, name)
        `,
        )
        .order('created_at', { ascending: false })
        .limit(80);

      if (error) throw error;
      return (data ?? []) as PrayerRequestWithMeta[];
    },
  });
}

export function useMyGroupsForPrayer(profileId: string | undefined) {
  return useQuery({
    queryKey: ['my-approved-groups', profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<Pick<ChurchGroup, 'id' | 'name'>[]> => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select('groups(id, name)')
        .eq('profile_id', profileId)
        .eq('status', 'approved');
      if (error) throw error;
      return (data ?? [])
        .map((row) => row.groups as unknown as Pick<ChurchGroup, 'id' | 'name'> | null)
        .filter((g): g is Pick<ChurchGroup, 'id' | 'name'> => Boolean(g));
    },
  });
}

export function useCreatePrayerRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      authorId: string;
      body: string;
      visibility: PrayerVisibility;
      isAnonymous: boolean;
      groupId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('prayer_requests')
        .insert({
          author_id: args.authorId,
          body: args.body.trim(),
          visibility: args.visibility,
          is_anonymous: args.isAnonymous,
          group_id: args.visibility === 'group_only' ? args.groupId ?? null : null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['prayer-requests'] });
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      void supabase.functions.invoke('send-push').catch(() => undefined);
    },
  });
}

export function useDeletePrayerRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prayer_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['prayer-requests'] });
    },
  });
}
