import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import {
  useCreateGroupMeeting,
  useMeetingAttendance,
  useToggleAttendance,
} from '@/features/groups/hooks/useGroups';
import type { GroupMeeting, GroupMember } from '@/lib/supabase/types';

type AttendancePanelProps = {
  groupId: string;
  profileId: string | undefined;
  canManage: boolean;
  meetings: GroupMeeting[];
  approvedRoster: GroupMember[];
};

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AttendancePanel({
  groupId,
  profileId,
  canManage,
  meetings,
  approvedRoster,
}: AttendancePanelProps) {
  const [meetingOn, setMeetingOn] = useState(todayIsoDate);
  const [notes, setNotes] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    meetings[0]?.id ?? null,
  );
  const create = useCreateGroupMeeting();
  const { data: attendance = [] } = useMeetingAttendance(selectedId ?? undefined);
  const toggle = useToggleAttendance();

  const presentByProfile = useMemo(() => {
    const map = new Map<string, { id: string; present: boolean }>();
    for (const row of attendance) {
      map.set(row.profile_id, { id: row.id, present: row.present });
    }
    return map;
  }, [attendance]);

  async function onCreateMeeting() {
    if (!profileId || !meetingOn.trim()) return;
    const row = await create.mutateAsync({
      groupId,
      meetingOn: meetingOn.trim(),
      notes,
      createdBy: profileId,
    });
    setSelectedId(row.id);
    setNotes('');
  }

  return (
    <View style={styles.wrap}>
      <AppText variant="heading">Attendance</AppText>
      <AppText muted variant="caption">
        Leaders create a meeting date and check in members.
      </AppText>

      {canManage ? (
        <View style={styles.create}>
          <TextField
            label="Meeting date (YYYY-MM-DD)"
            value={meetingOn}
            onChangeText={setMeetingOn}
            autoCapitalize="none"
          />
          <TextField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
          />
          <Button
            label="Add meeting"
            loading={create.isPending}
            onPress={onCreateMeeting}
          />
        </View>
      ) : null}

      <View style={styles.meetingList}>
        {meetings.length === 0 ? (
          <AppText muted>No meetings yet.</AppText>
        ) : (
          meetings.map((m) => {
            const active = selectedId === m.id;
            const label = new Date(`${m.meeting_on}T12:00:00`).toLocaleDateString(
              undefined,
              { weekday: 'short', month: 'short', day: 'numeric' },
            );
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedId(m.id)}
                style={[styles.meetingChip, active && styles.meetingChipActive]}
              >
                <AppText color={active ? colors.accent : colors.ink}>{label}</AppText>
              </Pressable>
            );
          })
        )}
      </View>

      {selectedId ? (
        <View style={styles.checkins}>
          {approvedRoster.length === 0 ? (
            <AppText muted>No approved members to check in.</AppText>
          ) : (
            approvedRoster.map((member) => {
              const entry = presentByProfile.get(member.profile_id);
              const present = Boolean(entry?.present);
              return (
                <View key={member.id} style={styles.checkRow}>
                  <AppText>
                    {member.member_display_name || 'Member'}
                  </AppText>
                  {canManage && profileId ? (
                    <Button
                      label={present ? 'Present' : 'Mark'}
                      variant={present ? 'secondary' : 'ghost'}
                      loading={toggle.isPending}
                      onPress={() =>
                        toggle.mutate({
                          meetingId: selectedId,
                          profileId: member.profile_id,
                          markedBy: profileId,
                          existingId: entry?.id,
                          present: !present,
                        })
                      }
                    />
                  ) : (
                    <AppText
                      variant="caption"
                      color={present ? colors.accent : colors.inkSubtle}
                    >
                      {present ? 'Present' : '—'}
                    </AppText>
                  )}
                </View>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  create: {
    gap: spacing.sm,
  },
  meetingList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  meetingChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
  meetingChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  checkins: {
    gap: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});
