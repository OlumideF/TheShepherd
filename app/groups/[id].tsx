import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Link, useLocalSearchParams, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AnnouncementCard } from '@/features/communication/components/AnnouncementCard';
import { useAnnouncements } from '@/features/communication/hooks/useAnnouncements';
import { AttendancePanel } from '@/features/groups/components/AttendancePanel';
import { GroupMessagesPanel } from '@/features/groups/components/GroupMessagesPanel';
import { RosterRow } from '@/features/groups/components/RosterRow';
import {
  useGroup,
  useGroupMeetings,
  useGroupMessages,
  useGroupRoster,
  useLeaveGroup,
  useMyGroupMembership,
  useRemoveGroupMember,
  useRequestJoinGroup,
  useUpdateGroup,
  useUpdateGroupMember,
} from '@/features/groups/hooks/useGroups';

type TabKey = 'about' | 'roster' | 'discussion' | 'attendance' | 'announcements';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = typeof id === 'string' ? id : undefined;
  const { profile, user } = useAuth();
  const profileId = profile?.id ?? user?.id;
  const isAdmin = profile?.role === 'admin';

  const { data: group, isLoading, isError, error } = useGroup(groupId);
  const { data: membership } = useMyGroupMembership(groupId, profileId);
  const { data: roster = [] } = useGroupRoster(groupId);
  const { data: messages = [] } = useGroupMessages(groupId);
  const { data: meetings = [] } = useGroupMeetings(groupId);
  const { data: announcements = [] } = useAnnouncements();

  const requestJoin = useRequestJoinGroup();
  const leave = useLeaveGroup();
  const updateMember = useUpdateGroupMember();
  const removeMember = useRemoveGroupMember();
  const updateGroup = useUpdateGroup();

  const [tab, setTab] = useState<TabKey>('about');
  const [actionError, setActionError] = useState<string | null>(null);

  const isLeader =
    isAdmin ||
    (membership?.status === 'approved' && membership.role_in_group === 'leader');
  const isApproved = membership?.status === 'approved';
  const isPending = membership?.status === 'pending';

  const approvedRoster = useMemo(
    () => roster.filter((m) => m.status === 'approved'),
    [roster],
  );
  const pendingRoster = useMemo(
    () => roster.filter((m) => m.status === 'pending'),
    [roster],
  );

  const groupAnnouncements = useMemo(
    () => announcements.filter((a) => a.group_id === groupId),
    [announcements, groupId],
  );

  async function onJoin() {
    if (!groupId) return;
    setActionError(null);
    try {
      await requestJoin.mutateAsync(groupId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not request join.');
    }
  }

  async function onLeave() {
    if (!membership || !groupId) return;
    setActionError(null);
    try {
      await leave.mutateAsync({
        membershipId: membership.id,
        groupId,
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not leave group.');
    }
  }

  async function onToggleApproval() {
    if (!groupId || !group) return;
    setActionError(null);
    try {
      await updateGroup.mutateAsync({
        groupId,
        patch: { requires_approval: !group.requires_approval },
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update setting.');
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (isError || !group) {
    return (
      <Screen>
        <AppText color={colors.danger}>
          {error instanceof Error ? error.message : 'Group not found.'}
        </AppText>
      </Screen>
    );
  }

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: 'about', label: 'About', show: true },
    { key: 'roster', label: 'Roster', show: isApproved || isLeader },
    { key: 'discussion', label: 'Discussion', show: isApproved || isLeader },
    { key: 'attendance', label: 'Attendance', show: isApproved || isLeader },
    {
      key: 'announcements',
      label: 'Announcements',
      show: isApproved || isLeader,
    },
  ];

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="title">{group.name}</AppText>
        {group.description ? <AppText muted>{group.description}</AppText> : null}

        <View style={styles.meta}>
          <AppText variant="caption" muted>
            {group.requires_approval ? 'Approval required' : 'Open join'}
          </AppText>
          {isLeader ? (
            <Button
              label={
                group.requires_approval
                  ? 'Turn off approval'
                  : 'Require approval'
              }
              variant="ghost"
              loading={updateGroup.isPending}
              onPress={onToggleApproval}
            />
          ) : null}
        </View>

        <View style={styles.joinRow}>
          {!membership ? (
            <Button
              label={
                group.requires_approval ? 'Request to join' : 'Join group'
              }
              loading={requestJoin.isPending}
              onPress={onJoin}
            />
          ) : null}
          {isPending ? (
            <AppText color={colors.accent}>Your join request is pending.</AppText>
          ) : null}
          {isApproved ? (
            <Button
              label="Leave group"
              variant="ghost"
              loading={leave.isPending}
              onPress={onLeave}
            />
          ) : null}
          {isLeader ? (
            <Link href={`/broadcasts/create?groupId=${group.id}` as Href} asChild>
              <Button label="Broadcast" variant="secondary" />
            </Link>
          ) : null}
          {isLeader ? (
            <Link
              href={`/announcements/create?groupId=${group.id}` as Href}
              asChild
            >
              <Button label="Group announcement" variant="secondary" />
            </Link>
          ) : null}
        </View>

        {actionError ? (
          <AppText color={colors.danger}>{actionError}</AppText>
        ) : null}

        <View style={styles.tabs}>
          {tabs
            .filter((t) => t.show)
            .map((t) => {
              const active = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(t.key)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <AppText
                    variant="caption"
                    color={active ? colors.accent : colors.inkMuted}
                  >
                    {t.label}
                  </AppText>
                </Pressable>
              );
            })}
        </View>

        {tab === 'about' ? (
          <View style={styles.section}>
            <AppText>
              {isApproved
                ? 'You are a member of this group. Use the tabs for roster, discussion, attendance, and announcements.'
                : isPending
                  ? 'A leader will review your request soon.'
                  : 'Join to see roster, discussion, and attendance.'}
            </AppText>
            <AppText muted variant="caption">
              {approvedRoster.length} approved member
              {approvedRoster.length === 1 ? '' : 's'}
              {isLeader && pendingRoster.length > 0
                ? ` · ${pendingRoster.length} pending`
                : ''}
            </AppText>
          </View>
        ) : null}

        {tab === 'roster' && (isApproved || isLeader) ? (
          <View style={styles.section}>
            {isLeader && pendingRoster.length > 0 ? (
              <>
                <AppText variant="heading">Pending</AppText>
                {pendingRoster.map((member) => (
                  <RosterRow
                    key={member.id}
                    member={member}
                    canManage={isLeader}
                    isSelf={member.profile_id === profileId}
                    busy={updateMember.isPending || removeMember.isPending}
                    onApprove={() =>
                      updateMember.mutate({
                        membershipId: member.id,
                        groupId: group.id,
                        patch: { status: 'approved' },
                      })
                    }
                    onDeny={() =>
                      removeMember.mutate({
                        membershipId: member.id,
                        groupId: group.id,
                      })
                    }
                  />
                ))}
              </>
            ) : null}

            <AppText variant="heading">Members</AppText>
            {approvedRoster.length === 0 ? (
              <AppText muted>No approved members yet.</AppText>
            ) : (
              approvedRoster.map((member) => (
                <RosterRow
                  key={member.id}
                  member={member}
                  canManage={isLeader}
                  isSelf={member.profile_id === profileId}
                  busy={updateMember.isPending || removeMember.isPending}
                  onMakeLeader={() =>
                    updateMember.mutate({
                      membershipId: member.id,
                      groupId: group.id,
                      patch: { role_in_group: 'leader' },
                    })
                  }
                  onMakeMember={() =>
                    updateMember.mutate({
                      membershipId: member.id,
                      groupId: group.id,
                      patch: { role_in_group: 'member' },
                    })
                  }
                  onRemove={() =>
                    removeMember.mutate({
                      membershipId: member.id,
                      groupId: group.id,
                    })
                  }
                />
              ))
            )}
          </View>
        ) : null}

        {tab === 'discussion' && (isApproved || isLeader) ? (
          <GroupMessagesPanel
            groupId={group.id}
            profileId={profileId}
            canModerate={isLeader}
            messages={messages}
          />
        ) : null}

        {tab === 'attendance' && (isApproved || isLeader) ? (
          <AttendancePanel
            groupId={group.id}
            profileId={profileId}
            canManage={isLeader}
            meetings={meetings}
            approvedRoster={approvedRoster}
          />
        ) : null}

        {tab === 'announcements' && (isApproved || isLeader) ? (
          <View style={styles.section}>
            <AppText variant="heading">Group announcements</AppText>
            <AppText muted variant="caption">
              Same church-wide announcements table, scoped to this group.
            </AppText>
            {groupAnnouncements.length === 0 ? (
              <AppText muted>No group announcements yet.</AppText>
            ) : (
              groupAnnouncements.map((item) => (
                <AnnouncementCard
                  key={item.id}
                  announcement={item}
                  profileId={profileId}
                />
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  joinRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
  tabActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  section: {
    gap: spacing.sm,
  },
});
