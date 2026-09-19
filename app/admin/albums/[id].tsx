import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import {
  pickAndUploadAlbumPhotos,
  useDeleteAlbum,
  useDeletePhoto,
  useUpdateAlbum,
} from '@/features/admin/hooks/useAdminAlbums';
import { canPublishMedia } from '@/features/admin/utils/permissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePhotoAlbum } from '@/features/media/hooks/usePhotoAlbums';

export default function EditAlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, user } = useAuth();
  const router = useRouter();
  const allowed = canPublishMedia(profile, user?.email);
  const { data, isLoading, refetch } = usePhotoAlbum(id);
  const update = useUpdateAlbum();
  const removeAlbum = useDeleteAlbum();
  const removePhoto = useDeletePhoto();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [takenOn, setTakenOn] = useState('');
  const [published, setPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!data?.album) return;
    setTitle(data.album.title);
    setDescription(data.album.description ?? '');
    setTakenOn(data.album.taken_on ?? '');
    setPublished(data.album.published);
  }, [data?.album]);

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Edit album' }} />
        <AppText color={colors.danger}>Publish permission required.</AppText>
      </Screen>
    );
  }

  if (isLoading || !data?.album) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Edit album' }} />
        <AppText muted>{isLoading ? 'Loading…' : 'Not found.'}</AppText>
      </Screen>
    );
  }

  const album = data.album;
  const photos = data.photos;

  async function onSave() {
    if (!id) return;
    setError(null);
    setMessage(null);
    try {
      await update.mutateAsync({
        id,
        patch: {
          title,
          description,
          taken_on: takenOn || null,
          published,
        },
      });
      setMessage('Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  }

  async function onAddPhotos() {
    if (!id) return;
    setError(null);
    setMessage(null);
    setUploading(true);
    try {
      const added = await pickAndUploadAlbumPhotos(id);
      setMessage(`Added ${added.length} photo${added.length === 1 ? '' : 's'}.`);
      await refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed.';
      if (!msg.toLowerCase().includes('cancel')) setError(msg);
    } finally {
      setUploading(false);
    }
  }

  function onDeleteAlbum() {
    if (!id) return;
    Alert.alert('Delete album?', 'All photos in this album will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeAlbum.mutateAsync(id);
            router.replace('/admin/albums' as Href);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed.');
          }
        },
      },
    ]);
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit album' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextField
          label="Taken on (YYYY-MM-DD)"
          value={takenOn}
          onChangeText={setTakenOn}
          autoCapitalize="none"
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: published }}
          onPress={() => setPublished((v) => !v)}
          style={[styles.toggle, published && styles.toggleOn]}
        >
          <AppText variant="bodyStrong">
            {published ? 'Published' : 'Draft (hidden)'}
          </AppText>
        </Pressable>

        <View style={styles.photos}>
          <AppText variant="heading">Photos ({photos.length})</AppText>
          <Button
            label="Add photos"
            variant="secondary"
            loading={uploading}
            onPress={onAddPhotos}
          />
          {photos.map((p) => (
            <View key={p.id} style={styles.photoRow}>
              <AppText variant="caption" numberOfLines={1}>
                {p.storage_path}
              </AppText>
              <Button
                label="Remove"
                variant="danger"
                onPress={() => {
                  Alert.alert('Remove photo?', undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () =>
                        removePhoto.mutate({
                          id: p.id,
                          albumId: album.id,
                          storagePath: p.storage_path,
                        }),
                    },
                  ]);
                }}
              />
            </View>
          ))}
        </View>

        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        {message ? <AppText color={colors.success}>{message}</AppText> : null}

        <Button label="Save changes" loading={update.isPending} onPress={onSave} />
        <Button
          label="Delete album"
          variant="danger"
          loading={removeAlbum.isPending}
          onPress={onDeleteAlbum}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  toggle: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.canvasElevated,
  },
  toggleOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  photos: {
    gap: spacing.sm,
  },
  photoRow: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
});
