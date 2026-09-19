import { View, StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type ScreenProps = ViewProps & {
  padded?: boolean;
  safe?: boolean;
};

export function Screen({
  children,
  padded = true,
  safe = true,
  style,
  ...rest
}: ScreenProps) {
  const Container = safe ? SafeAreaView : View;

  return (
    <Container style={[styles.root, padded && styles.padded, style]} {...rest}>
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
