import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { brand } from '@/constants/brand';
import { colors, spacing } from '@/constants/theme';

type BrandMarkProps = {
  /** Show app name under the logo */
  showAppName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  imageStyle?: StyleProp<ImageStyle>;
};

const sizes = {
  sm: { width: 140, height: 100 },
  md: { width: 200, height: 144 },
  lg: { width: 260, height: 188 },
} as const;

export function BrandMark({
  showAppName = true,
  size = 'md',
  imageStyle,
}: BrandMarkProps) {
  const dims = sizes[size];

  return (
    <View style={styles.wrap} accessibilityRole="header">
      <Image
        source={require('@/assets/images/church-logo.png')}
        style={[dims, styles.logo, imageStyle]}
        resizeMode="contain"
        accessibilityLabel={`${brand.appName} logo`}
      />
      {showAppName ? (
        <AppText variant="brand" style={styles.appName}>
          {brand.appName}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  logo: {
    marginBottom: spacing.sm,
  },
  appName: {
    color: colors.ink,
  },
});
