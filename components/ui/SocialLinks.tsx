import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { brand } from '@/constants/brand';
import { colors, radii, spacing } from '@/constants/theme';

export function SocialLinks() {
  const links = [
    { label: 'YouTube', url: brand.social.youtube.url },
    { label: 'Instagram', url: brand.social.instagram.url },
    { label: 'Facebook', url: brand.social.facebook.url },
  ] as const;

  return (
    <View style={styles.wrap}>
      {links.map((link) => (
        <Pressable
          key={link.label}
          accessibilityRole="link"
          accessibilityLabel={`Open ${link.label}`}
          onPress={() => Linking.openURL(link.url)}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <AppText variant="bodyStrong" color={colors.brand}>
            {link.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
});
