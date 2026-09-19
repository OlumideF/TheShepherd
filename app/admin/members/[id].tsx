import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import {
  useAdminMember,
  useUpdateMemberAdmin,
} from '@/features/admin/hooks/useAdminMembers';
import {
  assignableRoles,
  canAccessAdminHub,
  isSuperAdmin,
  isSuperAdminEmail,
} from '@/features/admin/utils/permissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { MembershipStatus, UserRole } from '@/lib/supabase/types';

const MEMBERSHIP_OPTIONS: MembershipStatus[] = [
  'visitor',
  'pending',
  'active',
  'inactive',
];

export default function AdminMemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: actor } = useAuth();
  const allowed = canAccessAdminHub(actor);
  const { data: member, isLoading } = useAdminMember(id, allowed);
  const update = useUpdateMemberAdmin();

  const roles = useMemo(
    () => assignableRoles(actor, member),
    [actor, member],
  );

  const [role, setRole] = useState<UserRole>('member');
  const [membershipStatus, setMembershipStatus] =
    useState<MembershipStatus>('active');
  const [canUpload, setCanUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    setRole(member.role);
    setMembershipStatus(member.membership_status);
    setCanUpload(member.can_upload_media);
  }, [member]);

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Member' }} />
        <AppText color={colors.danger}>Admins only.</AppText>
      </Screen>
    );
  }

  if (isLoading || !member) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Member' }} />
        <AppText muted>{isLoading ? 'Loading…' : 'Not found.'}</AppText>
      </Screen>
    );
  }

  const lockedSuper = isSuperAdminEmail(member.email);
  const isTargetAdminLocked =
    member.role === 'admin' && !isSuperAdmin(actor) && member.id !== actor?.id;

  async function onSave() {
    if (!id) return;
    setError(null);
    setMessage(null);
    try {
      await update.mutateAsync({
        id,
        role,
        membership_status: membershipStatus,
        can_upload_media: lockedSuper ? true : canUpload,
      });
      setMessage('Member updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update member.');
    }
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Edit member' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="title">
          {member.display_name || member.email || 'Member'}
        </AppText>
        <AppText muted>{member.email}</AppText>
        {lockedSuper ? (
          <AppText color={colors.accent}>
            Super admin — role and upload access are locked.
          </AppText>
        ) : null}

        <AppText variant="heading">Role</AppText>
        <View style={styles.chips}>
          {roles.map((r) => (
            <Chip
              key={r}
              label={r}
              active={role === r}
              disabled={lockedSuper || isTargetAdminLocked}
              onPress={() => setRole(r)}
            />
          ))}
        </View>

        <AppText variant="heading">Membership</AppText>
        <View style={styles.chips}>
          {MEMBERSHIP_OPTIONS.map((s) => (
            <Chip
              key={s}
              label={s}
              active={membershipStatus === s}
              disabled={isTargetAdminLocked && !isSuperAdmin(actor)}
              onPress={() => setMembershipStatus(s)}
            />
          ))}
        </View>

        <AppText variant="heading">Media upload</AppText>
        <AppText muted variant="caption">
          Admins and group leaders can always upload. Toggle grants upload to
          regular members.
        </AppText>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: canUpload || lockedSuper }}
          disabled={lockedSuper || isTargetAdminLocked}
          onPress={() => setCanUpload((v) => !v)}
          style={[
            styles.toggle,
            (canUpload || lockedSuper) && styles.toggleOn,
          ]}
        >
          <AppText variant="bodyStrong">
            {canUpload || lockedSuper
              ? 'Can upload media & albums'
              : 'Cannot upload (unless leader/admin)'}
          </AppText>
        </Pressable>

        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        {message ? <AppText color={colors.success}>{message}</AppText> : null}

        <Button
          label="Save"
          loading={update.isPending}
          disabled={isTargetAdminLocked && !isSuperAdmin(actor)}
          onPress={onSave}
        />
      </ScrollView>
    </Screen>
  );
}

function Chip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        active && styles.chipActive,
        disabled && styles.chipDisabled,
      ]}
    >
      <AppText
        variant="caption"
        color={active ? '#fff' : colors.ink}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  toggle: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.canvasElevated,
  },
  toggleOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
});
