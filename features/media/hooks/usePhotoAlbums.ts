import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import type { Photo, PhotoAlbum } from '@/lib/supabase/types';

export function usePhotoAlbums() {
  return useQuery({
    queryKey: ['photo-albums'],
    queryFn: async (): Promise<PhotoAlbum[]> => {
      const { data, error } = await supabase
        .from('photo_albums')
        .select('*')
        .eq('published', true)
        .order('taken_on', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePhotoAlbum(id: string | undefined) {
  return useQuery({
    queryKey: ['photo-album', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      const { data: album, error: albumError } = await supabase
        .from('photo_albums')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (albumError) throw albumError;
      if (!album) return null;

      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', id)
        .order('sort_order', { ascending: true });
      if (photosError) throw photosError;

      return { album, photos: (photos ?? []) as Photo[] };
    },
  });
}

export async function getPhotoSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('photo-albums')
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}
