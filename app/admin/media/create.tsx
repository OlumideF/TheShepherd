import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { useCreateMediaItem } from '@/features/admin/hooks/useAdminMedia';
import { canPublishMedia } from '@/features/admin/utils/permissions';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function CreateMediaScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const create = useCreateMediaItem();
  const allowed = canPublishMedia(profile);

  const [title, setTitle] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [series, setSeries] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [topic, setTopic] = useState('');
  const [preachedAt, setPreachedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [isLive, setIsLive] = useState(false);
  const [published, setPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'New sermon' }} />
        <AppText color={colors.danger}>Publish permission required.</AppText>
      </Screen>
    );
  }

  async function onSubmit() {
    setError(null);
    try {
      const item = await create.mutateAsync({
        title,
        youtube_id: youtubeId,
        series,
        speaker,
        topic,
        preached_at: preachedAt || null,
        is_live: isLive,
        published,
        kind: 'sermon',
      });
      router.replace(`/admin/media/${item.id}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create sermon.');
    }
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'New sermon' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText muted>
          Step 1: publish the YouTube video. Attach sermon audio later from the
          edit screen.
        </AppText>
        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField
          label="YouTube id or URL"
          value={youtubeId}
          onChangeText={setYoutubeId}
          autoCapitalize="none"
        />
        <TextField label="Series" value={series} onChangeText={setSeries} />
        <TextField label="Speaker" value={speaker} onChangeText={setSpeaker} />
        <TextField label="Topic" value={topic} onChangeText={setTopic} />
        <TextField
          label="Date (YYYY-MM-DD)"
          value={preachedAt}
          onChangeText={setPreachedAt}
          autoCapitalize="none"
        />

        <ToggleRow
          label={isLive ? 'Marked as live stream' : 'Not live'}
          checked={isLive}
          onPress={() => setIsLive((v) => !v)}
        />
        <ToggleRow
          label={published ? 'Published' : 'Draft (hidden)'}
          checked={published}
          onPress={() => setPublished((v) => !v)}
        />

        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button label="Create sermon" loading={create.isPending} onPress={onSubmit} />
      </ScrollView>
    </Screen>
  );
}

function ToggleRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={[styles.toggle, checked && styles.toggleOn]}
    >
      <AppText variant="bodyStrong">{label}</AppText>
    </Pressable>
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
