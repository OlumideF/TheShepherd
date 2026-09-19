import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import {
  pickAndUploadSermonAudio,
  useDeleteMediaItem,
  useUpdateMediaItem,
} from '@/features/admin/hooks/useAdminMedia';
import { canPublishMedia } from '@/features/admin/utils/permissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMediaItem } from '@/features/media/hooks/useMedia';

export default function EditMediaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, user } = useAuth();
  const router = useRouter();
  const allowed = canPublishMedia(profile, user?.email);
  const { data: item, isLoading, refetch } = useMediaItem(id);
  const update = useUpdateMediaItem();
  const remove = useDeleteMediaItem();

  const [title, setTitle] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [series, setSeries] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [topic, setTopic] = useState('');
  const [preachedAt, setPreachedAt] = useState('');
  const [duration, setDuration] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [published, setPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setYoutubeId(item.youtube_id ?? '');
    setSeries(item.series ?? '');
    setSpeaker(item.speaker ?? '');
    setTopic(item.topic ?? '');
    setPreachedAt(item.preached_at ?? '');
    setDuration(
      item.duration_seconds != null ? String(item.duration_seconds) : '',
    );
    setIsLive(item.is_live);
    setPublished(item.published);
  }, [item]);

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Edit sermon' }} />
        <AppText color={colors.danger}>Publish permission required.</AppText>
      </Screen>
    );
  }

  if (isLoading || !item) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Edit sermon' }} />
        <AppText muted>{isLoading ? 'Loading…' : 'Not found.'}</AppText>
      </Screen>
    );
  }

  async function onSave() {
    if (!id) return;
    setError(null);
    setMessage(null);
    try {
      const durationSeconds = duration.trim()
        ? Number.parseInt(duration.trim(), 10)
        : null;
      await update.mutateAsync({
        id,
        patch: {
          title,
          youtube_id: youtubeId,
          series,
          speaker,
          topic,
          preached_at: preachedAt || null,
          is_live: isLive,
          published,
          duration_seconds:
            durationSeconds != null && Number.isFinite(durationSeconds)
              ? durationSeconds
              : null,
        },
      });
      setMessage('Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  }

  async function onUploadAudio() {
    if (!id) return;
    setError(null);
    setMessage(null);
    setUploading(true);
    try {
      const durationSeconds = duration.trim()
        ? Number.parseInt(duration.trim(), 10)
        : null;
      await pickAndUploadSermonAudio(
        id,
        durationSeconds != null && Number.isFinite(durationSeconds)
          ? durationSeconds
          : null,
      );
      await refetch();
      setMessage('Audio uploaded and marked ready.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed.';
      if (!msg.toLowerCase().includes('cancel')) {
        setError(msg);
      }
    } finally {
      setUploading(false);
    }
  }

  function onDelete() {
    if (!id) return;
    Alert.alert('Delete sermon?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(id);
            router.replace('/admin/media' as Href);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed.');
          }
        },
      },
    ]);
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit sermon' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
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
        <TextField
          label="Audio duration (seconds, optional)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
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

        <View style={styles.audioBox}>
          <AppText variant="heading">Sermon audio</AppText>
          <AppText muted variant="caption">
            Status: {item.audio_status}
            {item.audio_file_path ? ` · ${item.audio_file_path}` : ''}
          </AppText>
          <Button
            label={
              item.audio_status === 'ready'
                ? 'Replace MP3'
                : 'Upload sermon MP3'
            }
            variant="secondary"
            loading={uploading}
            onPress={onUploadAudio}
          />
        </View>

        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        {message ? <AppText color={colors.success}>{message}</AppText> : null}

        <Button label="Save changes" loading={update.isPending} onPress={onSave} />
        <Button
          label="Delete sermon"
          variant="danger"
          loading={remove.isPending}
          onPress={onDelete}
        />
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
  audioBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
});
