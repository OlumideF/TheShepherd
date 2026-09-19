import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import type { MediaItem } from '@/lib/supabase/types';

export type MediaFilters = {
  search: string;
  series: string;
  speaker: string;
  topic: string;
};

export function useMediaArchive(filters: MediaFilters) {
  return useQuery({
    queryKey: ['media-archive', filters],
    queryFn: async (): Promise<MediaItem[]> => {
      let query = supabase
        .from('media_items')
        .select('*')
        .eq('published', true)
        .eq('is_live', false)
        .order('preached_at', { ascending: false, nullsFirst: false })
        .limit(100);

      const search = filters.search.trim();
      if (search) {
        const pattern = `%${search}%`;
        query = query.or(
          `title.ilike.${pattern},series.ilike.${pattern},speaker.ilike.${pattern},topic.ilike.${pattern}`,
        );
      }
      if (filters.series.trim()) {
        query = query.ilike('series', `%${filters.series.trim()}%`);
      }
      if (filters.speaker.trim()) {
        query = query.ilike('speaker', `%${filters.speaker.trim()}%`);
      }
      if (filters.topic.trim()) {
        query = query.ilike('topic', `%${filters.topic.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMediaItem(id: string | undefined) {
  return useQuery({
    queryKey: ['media-item', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<MediaItem | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useLiveMedia() {
  return useQuery({
    queryKey: ['media-live'],
    queryFn: async (): Promise<MediaItem | null> => {
      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .eq('published', true)
        .eq('is_live', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });
}
