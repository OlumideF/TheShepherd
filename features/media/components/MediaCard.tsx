import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing } from '@/constants/theme';
import type { MediaItem } from '@/lib/supabase/types';

type MediaCardProps = {
  item: MediaItem;
  onPress?: () => void;
};

export function MediaCard({ item, onPress }: MediaCardProps) {
  const meta = [item.speaker, item.series, item.preached_at]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.body}>
        <AppText variant="bodyStrong">{item.title}</AppText>
        {meta ? (
          <AppText variant="caption" muted>
            {meta}
          </AppText>
        ) : null}
        {item.topic ? (
          <AppText variant="caption" color={colors.accent}>
            {item.topic}
          </AppText>
        ) : null}
        <View style={styles.badges}>
          {item.youtube_id ? <Badge label="Video" /> : null}
          {item.audio_status === 'ready' ? <Badge label="Audio" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <AppText variant="caption" color={colors.brand}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvasElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  body: {
    gap: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
