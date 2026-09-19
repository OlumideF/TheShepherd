import { Text, type TextProps, StyleSheet } from 'react-native';

import { colors, typography } from '@/constants/theme';

type Variant = keyof typeof typography;

type AppTextProps = TextProps & {
  variant?: Variant;
  color?: string;
  muted?: boolean;
};

export function AppText({
  variant = 'body',
  color,
  muted = false,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[
        typography[variant],
        { color: color ?? (muted ? colors.inkMuted : colors.ink) },
        style,
      ]}
      {...rest}
    />
  );
}

export const textStyles = StyleSheet.create({
  brand: typography.brand,
});
