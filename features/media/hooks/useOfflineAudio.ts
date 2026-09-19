import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

import { supabase } from '@/lib/supabase/client';

const OFFLINE_DIR = 'sermon-audio';

function offlineFile(mediaId: string): File {
  const dir = new Directory(Paths.document, OFFLINE_DIR);
  if (!dir.exists) {
    dir.create();
  }
  return new File(dir, `${mediaId}.mp3`);
}

export function useOfflineAudio(mediaId: string, storagePath: string | null) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLocal = useCallback(() => {
    if (Platform.OS === 'web' || !storagePath) {
      setLocalUri(null);
      return;
    }
    const file = offlineFile(mediaId);
    setLocalUri(file.exists ? file.uri : null);
  }, [mediaId, storagePath]);

  useEffect(() => {
    refreshLocal();
  }, [refreshLocal]);

  useEffect(() => {
    let cancelled = false;
    async function loadSignedUrl() {
      if (!storagePath) {
        setRemoteUrl(null);
        return;
      }
      const { data, error: signError } = await supabase.storage
        .from('sermon-audio')
        .createSignedUrl(storagePath, 60 * 60);

      if (cancelled) return;
      if (signError) {
        setError(signError.message);
        setRemoteUrl(null);
        return;
      }
      setRemoteUrl(data.signedUrl);
    }
    loadSignedUrl();
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  const download = useCallback(async () => {
    if (!storagePath || !remoteUrl) {
      setError('Audio is not available to download.');
      return;
    }
    if (Platform.OS === 'web') {
      setError('Offline download is available in the mobile app.');
      return;
    }

    setDownloading(true);
    setError(null);
    try {
      const target = offlineFile(mediaId);
      if (target.exists) {
        target.delete();
      }
      const downloaded = await File.downloadFileAsync(remoteUrl, target);
      setLocalUri(downloaded.uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed.');
    } finally {
      setDownloading(false);
    }
  }, [mediaId, remoteUrl, storagePath]);

  const removeDownload = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const file = offlineFile(mediaId);
    if (file.exists) {
      file.delete();
    }
    setLocalUri(null);
  }, [mediaId]);

  return {
    playUri: localUri ?? remoteUrl,
    isOffline: Boolean(localUri),
    downloading,
    error,
    download,
    removeDownload,
  };
}
