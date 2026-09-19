import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ANNOUNCEMENT_REACTION_EMOJIS } from '@/features/communication/constants';
import { supabase } from '@/lib/supabase/client';
import type {
  Announcement,
  AnnouncementComment,
  AnnouncementReaction,
} from '@/lib/supabase/types';

export type AnnouncementWithMeta = Announcement & {
  announcement_reactions: AnnouncementReaction[];
  announcement_comments: AnnouncementComment[];
};

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async (): Promise<AnnouncementWithMeta[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select(
          `
          *,
          announcement_reactions(*),
          announcement_comments(*)
        `,
        )
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(40);

      if (error) throw error;
      return (data ?? []) as AnnouncementWithMeta[];
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      title: string;
      body: string;
      authorId: string;
      groupId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title: args.title.trim(),
          body: args.body.trim(),
          author_id: args.authorId,
          group_id: args.groupId ?? null,
          published: true,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['announcements'] });
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      void supabase.functions.invoke('send-push').catch(() => undefined);
    },
  });
}

export function useToggleAnnouncementReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      announcementId: string;
      profileId: string;
      emoji: string;
      existingId?: string;
    }) => {
      if (!ANNOUNCEMENT_REACTION_EMOJIS.includes(args.emoji as (typeof ANNOUNCEMENT_REACTION_EMOJIS)[number])) {
        throw new Error('Unsupported reaction');
      }

      if (args.existingId) {
        const { error } = await supabase
          .from('announcement_reactions')
          .delete()
          .eq('id', args.existingId);
        if (error) throw error;
        return { removed: true as const };
      }

      const { data, error } = await supabase
        .from('announcement_reactions')
        .insert({
          announcement_id: args.announcementId,
          profile_id: args.profileId,
          emoji: args.emoji,
        })
        .select('*')
        .single();
      if (error) throw error;
      return { removed: false as const, reaction: data };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useAddAnnouncementComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      announcementId: string;
      authorId: string;
      body: string;
    }) => {
      const { data, error } = await supabase
        .from('announcement_comments')
        .insert({
          announcement_id: args.announcementId,
          author_id: args.authorId,
          body: args.body.trim(),
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}
