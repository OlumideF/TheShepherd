import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { SermonAudioPlayer } from '@/features/media/components/SermonAudioPlayer';
import { YoutubePlayer } from '@/features/media/components/YoutubePlayer';
import { useMediaItem } from '@/features/media/hooks/useMedia';

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, error } = useMediaItem(id);

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: data?.title ?? 'Sermon',
        }}
      />

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : isError || !data ? (
        <View style={styles.pad}>
          <AppText color={colors.danger}>
            {error instanceof Error ? error.message : 'Sermon not found.'}
          </AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <AppText variant="title">{data.title}</AppText>
          <AppText muted>
            {[data.speaker, data.series, data.preached_at].filter(Boolean).join(' · ')}
          </AppText>
          {data.topic ? (
            <AppText variant="caption" color={colors.accent}>
              {data.topic}
            </AppText>
          ) : null}

          {data.is_live ? (
            <AppText variant="bodyStrong" color={colors.accent}>
              Live now
            </AppText>
          ) : null}

          {data.youtube_id ? (
            <YoutubePlayer videoId={data.youtube_id} height={240} />
          ) : null}

          {data.audio_status === 'ready' && data.audio_file_path ? (
            <SermonAudioPlayer
              mediaId={data.id}
              storagePath={data.audio_file_path}
              title={data.title}
            />
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: spacing.xl,
  },
  pad: {
    padding: spacing.lg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
