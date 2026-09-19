import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { spacing } from '@/constants/theme';

type PlaceholderProps = {
  title: string;
  phase: string;
  blurb: string;
};

export function ModulePlaceholder({ title, phase, blurb }: PlaceholderProps) {
  return (
    <Screen>
      <View style={styles.wrap}>
        <AppText variant="title">{title}</AppText>
        <AppText muted>{phase}</AppText>
        <AppText style={styles.blurb}>{blurb}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  blurb: {
    marginTop: spacing.md,
    maxWidth: 360,
  },
});
