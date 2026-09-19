import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import type {
  ChurchGroup,
  GroupAttendance,
  GroupMeeting,
  GroupMember,
  GroupMemberRole,
  GroupMemberStatus,
  GroupMessage,
  UserRole,
} from '@/lib/supabase/types';

export type GroupListItem = ChurchGroup & {
  membership: Pick<
    GroupMember,
    'id' | 'status' | 'role_in_group'
  > | null;
};

export function canManageGroups(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'group_leader';
}

export function useGroups(profileId: string | undefined) {
  return useQuery({
    queryKey: ['groups', profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<GroupListItem[]> => {
      if (!profileId) return [];

      const [{ data: groups, error: groupsError }, { data: memberships, error: memError }] =
        await Promise.all([
          supabase.from('groups').select('*').order('name'),
          supabase
            .from('group_members')
            .select('id, group_id, status, role_in_group')
            .eq('profile_id', profileId),
        ]);

      if (groupsError) throw groupsError;
      if (memError) throw memError;

      const byGroup = new Map(
        (memberships ?? []).map((m) => [m.group_id, m] as const),
      );

      return (groups ?? []).map((group) => {
        const membership = byGroup.get(group.id);
        return {
          ...group,
          membership: membership
            ? {
                id: membership.id,
                status: membership.status,
                role_in_group: membership.role_in_group,
              }
            : null,
        };
      });
    },
  });
}

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group', groupId],
    enabled: Boolean(groupId),
    queryFn: async (): Promise<ChurchGroup | null> => {
      if (!groupId) return null;
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyGroupMembership(
  groupId: string | undefined,
  profileId: string | undefined,
) {
  return useQuery({
    queryKey: ['group-membership', groupId, profileId],
    enabled: Boolean(groupId && profileId),
    queryFn: async (): Promise<GroupMember | null> => {
      if (!groupId || !profileId) return null;
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('profile_id', profileId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useGroupRoster(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-roster', groupId],
    enabled: Boolean(groupId),
    queryFn: async (): Promise<GroupMember[]> => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      description?: string;
      requiresApproval: boolean;
    }) => {
      const { data, error } = await supabase.rpc('create_church_group', {
        p_name: args.name.trim(),
        p_description: args.description?.trim() || null,
        p_requires_approval: args.requiresApproval,
        p_published: true,
      });
      if (error) throw error;
      return data as ChurchGroup;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['groups'] });
      await qc.invalidateQueries({ queryKey: ['leadable-groups'] });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      groupId: string;
      patch: Partial<
        Pick<ChurchGroup, 'name' | 'description' | 'requires_approval' | 'published'>
      >;
    }) => {
      const { data, error } = await supabase
        .from('groups')
        .update(args.patch)
        .eq('id', args.groupId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['groups'] });
      await qc.invalidateQueries({ queryKey: ['group', vars.groupId] });
    },
  });
}

export function useRequestJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { data, error } = await supabase.rpc('request_join_group', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return data as GroupMember;
    },
    onSuccess: async (row) => {
      await qc.invalidateQueries({ queryKey: ['groups'] });
      await qc.invalidateQueries({ queryKey: ['group-membership', row.group_id] });
      await qc.invalidateQueries({ queryKey: ['group-roster', row.group_id] });
      await qc.invalidateQueries({ queryKey: ['my-approved-groups'] });
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { membershipId: string; groupId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', args.membershipId);
      if (error) throw error;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['groups'] });
      await qc.invalidateQueries({ queryKey: ['group-membership', vars.groupId] });
      await qc.invalidateQueries({ queryKey: ['group-roster', vars.groupId] });
      await qc.invalidateQueries({ queryKey: ['my-approved-groups'] });
    },
  });
}

export function useUpdateGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      membershipId: string;
      groupId: string;
      patch: Partial<{
        status: GroupMemberStatus;
        role_in_group: GroupMemberRole;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('group_members')
        .update(args.patch)
        .eq('id', args.membershipId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['group-roster', vars.groupId] });
      await qc.invalidateQueries({ queryKey: ['group-membership', vars.groupId] });
      await qc.invalidateQueries({ queryKey: ['groups'] });
      await qc.invalidateQueries({ queryKey: ['leadable-groups'] });
    },
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { membershipId: string; groupId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', args.membershipId);
      if (error) throw error;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['group-roster', vars.groupId] });
      await qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useGroupMessages(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-messages', groupId],
    enabled: Boolean(groupId),
    queryFn: async (): Promise<GroupMessage[]> => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(80);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePostGroupMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      groupId: string;
      authorId: string;
      body: string;
    }) => {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: args.groupId,
          author_id: args.authorId,
          body: args.body.trim(),
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['group-messages', vars.groupId] });
    },
  });
}

export function useDeleteGroupMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { messageId: string; groupId: string }) => {
      const { error } = await supabase
        .from('group_messages')
        .delete()
        .eq('id', args.messageId);
      if (error) throw error;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['group-messages', vars.groupId] });
    },
  });
}

export function useGroupMeetings(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-meetings', groupId],
    enabled: Boolean(groupId),
    queryFn: async (): Promise<GroupMeeting[]> => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_meetings')
        .select('*')
        .eq('group_id', groupId)
        .order('meeting_on', { ascending: false })
        .limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateGroupMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      groupId: string;
      meetingOn: string;
      notes?: string;
      createdBy: string;
    }) => {
      const { data, error } = await supabase
        .from('group_meetings')
        .insert({
          group_id: args.groupId,
          meeting_on: args.meetingOn,
          notes: args.notes?.trim() || null,
          created_by: args.createdBy,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['group-meetings', vars.groupId] });
    },
  });
}

export function useMeetingAttendance(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['group-attendance', meetingId],
    enabled: Boolean(meetingId),
    queryFn: async (): Promise<GroupAttendance[]> => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from('group_attendance')
        .select('*')
        .eq('meeting_id', meetingId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      meetingId: string;
      profileId: string;
      markedBy: string;
      existingId?: string;
      present?: boolean;
    }) => {
      if (args.existingId) {
        const nextPresent = args.present ?? false;
        if (!nextPresent) {
          const { error } = await supabase
            .from('group_attendance')
            .delete()
            .eq('id', args.existingId);
          if (error) throw error;
          return { removed: true as const };
        }
        const { data, error } = await supabase
          .from('group_attendance')
          .update({ present: true, marked_by: args.markedBy })
          .eq('id', args.existingId)
          .select('*')
          .single();
        if (error) throw error;
        return { removed: false as const, row: data };
      }

      const { data, error } = await supabase
        .from('group_attendance')
        .insert({
          meeting_id: args.meetingId,
          profile_id: args.profileId,
          present: true,
          marked_by: args.markedBy,
        })
        .select('*')
        .single();
      if (error) throw error;
      return { removed: false as const, row: data };
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({
        queryKey: ['group-attendance', vars.meetingId],
      });
    },
  });
}
