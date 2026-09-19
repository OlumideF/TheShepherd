import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { useCreateAlbum } from '@/features/admin/hooks/useAdminAlbums';
import { canPublishMedia } from '@/features/admin/utils/permissions';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function CreateAlbumScreen() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const create = useCreateAlbum();
  const allowed = canPublishMedia(profile, user?.email);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [takenOn, setTakenOn] = useState(new Date().toISOString().slice(0, 10));
  const [published, setPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'New album' }} />
        <AppText color={colors.danger}>Publish permission required.</AppText>
      </Screen>
    );
  }

  async function onSubmit() {
    setError(null);
    try {
      const album = await create.mutateAsync({
        title,
        description,
        taken_on: takenOn || null,
        published,
      });
      router.replace(`/admin/albums/${album.id}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create album.');
    }
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'New album' }} />
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
        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button label="Create album" loading={create.isPending} onPress={onSubmit} />
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
});
