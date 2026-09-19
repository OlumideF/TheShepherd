import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing } from '@/constants/theme';
import type { DirectoryMember } from '@/lib/supabase/types';

type MemberCardProps = {
  member: DirectoryMember;
  onPress?: () => void;
};

export function MemberCard({ member, onPress }: MemberCardProps) {
  const name =
    member.display_name ||
    [member.first_name, member.last_name].filter(Boolean).join(' ') ||
    'Member';

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <AppText variant="bodyStrong" color={colors.brand}>
          {initials || '?'}
        </AppText>
      </View>
      <View style={styles.body}>
        <AppText variant="bodyStrong">{name}</AppText>
        {member.email ? (
          <AppText variant="caption" muted>
            {member.email}
          </AppText>
        ) : null}
        {member.phone ? (
          <AppText variant="caption" muted>
            {member.phone}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.canvasElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
});
