import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import {
  getPhotoSignedUrl,
  usePhotoAlbum,
} from '@/features/media/hooks/usePhotoAlbums';
import type { Photo } from '@/lib/supabase/types';

type PhotoWithUrl = Photo & { url: string | null };

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, error } = usePhotoAlbum(id);
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!data?.photos) {
        setPhotos([]);
        return;
      }
      const next = await Promise.all(
        data.photos.map(async (photo) => ({
          ...photo,
          url: await getPhotoSignedUrl(photo.storage_path),
        })),
      );
      if (!cancelled) setPhotos(next);
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [data?.photos]);

  async function downloadPhoto(photo: PhotoWithUrl) {
    if (!photo.url) return;
    setBusyId(photo.id);
    setMessage(null);
    try {
      if (Platform.OS === 'web') {
        if (typeof document !== 'undefined') {
          const a = document.createElement('a');
          a.href = photo.url;
          a.download = photo.storage_path.split('/').pop() ?? 'photo.jpg';
          a.target = '_blank';
          a.rel = 'noopener';
          a.click();
        } else {
          // Fallback: open in new tab
          // eslint-disable-next-line no-restricted-globals
          window.open(photo.url, '_blank', 'noopener,noreferrer');
        }
        setMessage('Download started.');
      } else {
        const dest = new File(Paths.cache, `photo-${photo.id}.jpg`);
        if (dest.exists) dest.delete();
        const file = await File.downloadFileAsync(photo.url, dest);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri);
        } else {
          setMessage('Saved to device cache. Sharing is unavailable.');
        }
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Download failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: data?.album.title ?? 'Album',
        }}
      />

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : isError || !data ? (
        <View style={styles.pad}>
          <AppText color={colors.danger}>
            {error instanceof Error ? error.message : 'Album not found.'}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <AppText variant="title">{data.album.title}</AppText>
              {data.album.description ? (
                <AppText muted>{data.album.description}</AppText>
              ) : null}
              {message ? <AppText color={colors.success}>{message}</AppText> : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.pad}>
              <AppText muted>No photos in this album yet.</AppText>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.tile}>
              {item.url ? (
                <Image source={{ uri: item.url }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <AppText muted>…</AppText>
                </View>
              )}
              {item.caption ? (
                <AppText variant="caption" numberOfLines={2}>
                  {item.caption}
                </AppText>
              ) : null}
              <Button
                label="Download"
                variant="ghost"
                loading={busyId === item.id}
                disabled={!item.url}
                onPress={() => downloadPhoto(item)}
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing.xl },
  pad: { padding: spacing.lg },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.line,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
