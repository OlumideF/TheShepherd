import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import type { Photo, PhotoAlbum } from '@/lib/supabase/types';

export type AlbumWriteInput = {
  title: string;
  description?: string | null;
  event_id?: string | null;
  taken_on?: string | null;
  published?: boolean;
};

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

export function useAdminAlbums(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-albums'],
    enabled,
    queryFn: async (): Promise<PhotoAlbum[]> => {
      const { data, error } = await supabase
        .from('photo_albums')
        .select('*')
        .order('taken_on', { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AlbumWriteInput): Promise<PhotoAlbum> => {
      if (!input.title.trim()) throw new Error('Title is required.');
      const { data, error } = await supabase
        .from('photo_albums')
        .insert({
          title: input.title.trim(),
          description: input.description?.trim() || null,
          event_id: input.event_id || null,
          taken_on: input.taken_on || null,
          published: input.published ?? true,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-albums'] });
      await qc.invalidateQueries({ queryKey: ['photo-albums'] });
    },
  });
}

export function useUpdateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      patch: AlbumWriteInput & { cover_path?: string | null };
    }) => {
      const { data, error } = await supabase
        .from('photo_albums')
        .update({
          title: args.patch.title.trim(),
          description: args.patch.description?.trim() || null,
          event_id: args.patch.event_id || null,
          taken_on: args.patch.taken_on || null,
          published: args.patch.published ?? true,
          ...(args.patch.cover_path !== undefined
            ? { cover_path: args.patch.cover_path }
            : {}),
        })
        .eq('id', args.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (_d, vars) => {
      await qc.invalidateQueries({ queryKey: ['admin-albums'] });
      await qc.invalidateQueries({ queryKey: ['photo-albums'] });
      await qc.invalidateQueries({ queryKey: ['photo-album', vars.id] });
    },
  });
}

export function useDeleteAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: photos } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('album_id', id);
      const paths = (photos ?? []).map((p) => p.storage_path);
      if (paths.length) {
        await supabase.storage.from('photo-albums').remove(paths);
      }
      const { error } = await supabase.from('photo_albums').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-albums'] });
      await qc.invalidateQueries({ queryKey: ['photo-albums'] });
    },
  });
}

export async function pickAndUploadAlbumPhotos(albumId: string): Promise<Photo[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.length) {
    throw new Error('Photo pick cancelled.');
  }

  const { data: existing } = await supabase
    .from('photos')
    .select('sort_order')
    .eq('album_id', albumId)
    .order('sort_order', { ascending: false })
    .limit(1);

  let sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;
  const inserted: Photo[] = [];

  for (const asset of result.assets) {
    const ext =
      asset.fileName?.split('.').pop()?.toLowerCase() ||
      (asset.mimeType?.includes('png') ? 'png' : 'jpg');
    const path = `${albumId}/${Date.now()}-${sortOrder}.${ext}`;
    const body =
      Platform.OS === 'web' && asset.file
        ? asset.file
        : await uriToBlob(asset.uri);

    const { error: uploadError } = await supabase.storage
      .from('photo-albums')
      .upload(path, body, {
        contentType: asset.mimeType ?? 'image/jpeg',
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('photos')
      .insert({
        album_id: albumId,
        storage_path: path,
        sort_order: sortOrder,
      })
      .select('*')
      .single();
    if (error) throw error;
    inserted.push(data);
    sortOrder += 1;
  }

  // Set cover if missing
  const { data: album } = await supabase
    .from('photo_albums')
    .select('cover_path')
    .eq('id', albumId)
    .maybeSingle();

  if (!album?.cover_path && inserted[0]) {
    await supabase
      .from('photo_albums')
      .update({ cover_path: inserted[0].storage_path })
      .eq('id', albumId);
  }

  return inserted;
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; albumId: string; storagePath: string }) => {
      await supabase.storage.from('photo-albums').remove([args.storagePath]);
      const { error } = await supabase.from('photos').delete().eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: async (_d, vars) => {
      await qc.invalidateQueries({ queryKey: ['photo-album', vars.albumId] });
      await qc.invalidateQueries({ queryKey: ['admin-albums'] });
    },
  });
}
