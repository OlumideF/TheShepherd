import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing } from '@/constants/theme';
import type { GroupListItem } from '@/features/groups/hooks/useGroups';

type GroupCardProps = {
  group: GroupListItem;
  onPress?: () => void;
};

function membershipLabel(group: GroupListItem): string | null {
  if (!group.membership) return null;
  if (group.membership.status === 'pending') return 'Request pending';
  if (group.membership.role_in_group === 'leader') return 'Leader';
  return 'Member';
}

export function GroupCard({ group, onPress }: GroupCardProps) {
  const badge = membershipLabel(group);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${group.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <AppText variant="heading">{group.name}</AppText>
        {badge ? (
          <View style={styles.badge}>
            <AppText variant="caption" color={colors.accent}>
              {badge}
            </AppText>
          </View>
        ) : null}
      </View>
      {group.description ? (
        <AppText muted numberOfLines={2}>
          {group.description}
        </AppText>
      ) : null}
      <AppText variant="caption" muted>
        {group.requires_approval ? 'Approval required to join' : 'Open join'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvasElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
  },
});
