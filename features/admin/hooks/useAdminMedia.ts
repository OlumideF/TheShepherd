import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import type { MediaItem, MediaKind } from '@/lib/supabase/types';

export type MediaWriteInput = {
  title: string;
  series?: string | null;
  speaker?: string | null;
  preached_at?: string | null;
  topic?: string | null;
  youtube_id?: string | null;
  kind?: MediaKind;
  is_live?: boolean;
  published?: boolean;
};

function normalizeYoutubeId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  const watch = value.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watch?.[1]) return watch[1];
  const short = value.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (short?.[1]) return short[1];
  const embed = value.match(/embed\/([a-zA-Z0-9_-]{6,})/);
  if (embed?.[1]) return embed[1];
  if (/^[a-zA-Z0-9_-]{6,}$/.test(value)) return value;
  return value;
}

export function useAdminMediaList(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-media-list'],
    enabled,
    queryFn: async (): Promise<MediaItem[]> => {
      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .order('preached_at', { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateMediaItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MediaWriteInput): Promise<MediaItem> => {
      const youtubeId = normalizeYoutubeId(input.youtube_id);
      if (!youtubeId) {
        throw new Error('YouTube id or URL is required for a new sermon.');
      }
      if (!input.title.trim()) {
        throw new Error('Title is required.');
      }
      const { data, error } = await supabase
        .from('media_items')
        .insert({
          title: input.title.trim(),
          series: input.series?.trim() || null,
          speaker: input.speaker?.trim() || null,
          preached_at: input.preached_at || null,
          topic: input.topic?.trim() || null,
          youtube_id: youtubeId,
          kind: input.kind ?? 'sermon',
          is_live: input.is_live ?? false,
          published: input.published ?? true,
          audio_status: 'none',
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-media-list'] });
      await qc.invalidateQueries({ queryKey: ['media-archive'] });
      await qc.invalidateQueries({ queryKey: ['media-live'] });
    },
  });
}

export function useUpdateMediaItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      patch: MediaWriteInput & {
        audio_file_path?: string | null;
        audio_status?: MediaItem['audio_status'];
        duration_seconds?: number | null;
      };
    }): Promise<MediaItem> => {
      const youtubeId =
        args.patch.youtube_id !== undefined
          ? normalizeYoutubeId(args.patch.youtube_id)
          : undefined;

      const { data, error } = await supabase
        .from('media_items')
        .update({
          ...(args.patch.title !== undefined
            ? { title: args.patch.title.trim() }
            : {}),
          ...(args.patch.series !== undefined
            ? { series: args.patch.series?.trim() || null }
            : {}),
          ...(args.patch.speaker !== undefined
            ? { speaker: args.patch.speaker?.trim() || null }
            : {}),
          ...(args.patch.preached_at !== undefined
            ? { preached_at: args.patch.preached_at || null }
            : {}),
          ...(args.patch.topic !== undefined
            ? { topic: args.patch.topic?.trim() || null }
            : {}),
          ...(youtubeId !== undefined ? { youtube_id: youtubeId } : {}),
          ...(args.patch.kind !== undefined ? { kind: args.patch.kind } : {}),
          ...(args.patch.is_live !== undefined
            ? { is_live: args.patch.is_live }
            : {}),
          ...(args.patch.published !== undefined
            ? { published: args.patch.published }
            : {}),
          ...(args.patch.audio_file_path !== undefined
            ? { audio_file_path: args.patch.audio_file_path }
            : {}),
          ...(args.patch.audio_status !== undefined
            ? { audio_status: args.patch.audio_status }
            : {}),
          ...(args.patch.duration_seconds !== undefined
            ? { duration_seconds: args.patch.duration_seconds }
            : {}),
        })
        .eq('id', args.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['admin-media-list'] });
      await qc.invalidateQueries({ queryKey: ['media-item', vars.id] });
      await qc.invalidateQueries({ queryKey: ['media-archive'] });
      await qc.invalidateQueries({ queryKey: ['media-live'] });
    },
  });
}

export function useDeleteMediaItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase
        .from('media_items')
        .select('audio_file_path')
        .eq('id', id)
        .maybeSingle();

      if (item?.audio_file_path) {
        await supabase.storage.from('sermon-audio').remove([item.audio_file_path]);
      }

      const { error } = await supabase.from('media_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-media-list'] });
      await qc.invalidateQueries({ queryKey: ['media-archive'] });
      await qc.invalidateQueries({ queryKey: ['media-live'] });
    },
  });
}

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

export async function pickAndUploadSermonAudio(
  mediaId: string,
  durationSeconds?: number | null,
): Promise<{ path: string; duration_seconds: number | null }> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['audio/mpeg', 'audio/mp3', 'audio/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || !picked.assets?.[0]) {
    throw new Error('Audio pick cancelled.');
  }

  const asset = picked.assets[0];
  const ext =
    asset.name?.split('.').pop()?.toLowerCase() === 'm4a' ? 'm4a' : 'mp3';
  const path = `${mediaId}/${Date.now()}.${ext}`;

  const body =
    Platform.OS === 'web' && asset.file
      ? asset.file
      : await uriToBlob(asset.uri);

  const { error: uploadError } = await supabase.storage
    .from('sermon-audio')
    .upload(path, body, {
      contentType: asset.mimeType ?? 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // Remove previous audio if replacing
  const { data: existing } = await supabase
    .from('media_items')
    .select('audio_file_path')
    .eq('id', mediaId)
    .maybeSingle();

  if (existing?.audio_file_path && existing.audio_file_path !== path) {
    await supabase.storage
      .from('sermon-audio')
      .remove([existing.audio_file_path]);
  }

  const { error: updateError } = await supabase
    .from('media_items')
    .update({
      audio_file_path: path,
      audio_status: 'ready',
      duration_seconds: durationSeconds ?? null,
    })
    .eq('id', mediaId);

  if (updateError) throw updateError;

  return { path, duration_seconds: durationSeconds ?? null };
}
