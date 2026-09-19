import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing } from '@/constants/theme';
import { useOfflineAudio } from '@/features/media/hooks/useOfflineAudio';

type SermonAudioPlayerProps = {
  mediaId: string;
  storagePath: string;
  title: string;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SermonAudioPlayer({
  mediaId,
  storagePath,
  title,
}: SermonAudioPlayerProps) {
  const { playUri, isOffline, downloading, error, download, removeDownload } =
    useOfflineAudio(mediaId, storagePath);

  const player = useAudioPlayer(playUri ? { uri: playUri } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {
      // Non-fatal on web / unsupported platforms
    });
  }, []);

  useEffect(() => {
    if (playUri) {
      player.replace({ uri: playUri });
    }
  }, [playUri, player]);

  return (
    <View style={styles.wrap} accessibilityLabel={`Audio player for ${title}`}>
      <AppText variant="heading">Sermon audio</AppText>
      <AppText muted variant="caption">
        {isOffline ? 'Playing offline copy' : 'Streaming from church library'}
      </AppText>

      <View style={styles.controls}>
        <Button
          label={status.playing ? 'Pause' : 'Play'}
          onPress={() => {
            if (status.playing) {
              player.pause();
            } else {
              player.play();
            }
          }}
          disabled={!playUri}
        />
        <AppText variant="caption" muted>
          {formatTime(status.currentTime)} / {formatTime(status.duration)}
        </AppText>
      </View>

      <View style={styles.row}>
        {isOffline ? (
          <Button label="Remove download" variant="ghost" onPress={removeDownload} />
        ) : (
          <Button
            label="Download for offline"
            variant="secondary"
            loading={downloading}
            disabled={!playUri}
            onPress={download}
          />
        )}
      </View>

      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  row: {
    marginTop: spacing.xs,
  },
});
