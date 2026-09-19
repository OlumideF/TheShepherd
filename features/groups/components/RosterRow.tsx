import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing } from '@/constants/theme';
import type { GroupMember } from '@/lib/supabase/types';

type RosterRowProps = {
  member: GroupMember;
  canManage: boolean;
  isSelf: boolean;
  onApprove?: () => void;
  onDeny?: () => void;
  onMakeLeader?: () => void;
  onMakeMember?: () => void;
  onRemove?: () => void;
  busy?: boolean;
};

export function RosterRow({
  member,
  canManage,
  isSelf,
  onApprove,
  onDeny,
  onMakeLeader,
  onMakeMember,
  onRemove,
  busy,
}: RosterRowProps) {
  const name = member.member_display_name || 'Member';
  const pending = member.status === 'pending';
  const isLeader = member.role_in_group === 'leader';

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <AppText variant="bodyStrong">{name}</AppText>
        <AppText variant="caption" muted>
          {pending ? 'Pending approval' : isLeader ? 'Leader' : 'Member'}
        </AppText>
      </View>

      {canManage && pending ? (
        <View style={styles.actions}>
          <Button
            label="Approve"
            variant="secondary"
            loading={busy}
            onPress={onApprove}
          />
          <Button label="Deny" variant="ghost" loading={busy} onPress={onDeny} />
        </View>
      ) : null}

      {canManage && !pending && !isSelf ? (
        <View style={styles.actions}>
          {isLeader ? (
            <Button
              label="Make member"
              variant="ghost"
              loading={busy}
              onPress={onMakeMember}
            />
          ) : (
            <Button
              label="Make leader"
              variant="secondary"
              loading={busy}
              onPress={onMakeLeader}
            />
          )}
          <Button
            label="Remove"
            variant="danger"
            loading={busy}
            onPress={onRemove}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.canvasElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  info: {
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
