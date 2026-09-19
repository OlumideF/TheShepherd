import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import type { MembershipStatus, Profile, UserRole } from '@/lib/supabase/types';

export type AdminMemberRow = Pick<
  Profile,
  | 'id'
  | 'email'
  | 'display_name'
  | 'first_name'
  | 'last_name'
  | 'role'
  | 'membership_status'
  | 'can_upload_media'
  | 'created_at'
>;

export function useAdminMembers(enabled: boolean, search: string) {
  return useQuery({
    queryKey: ['admin-members', search],
    enabled,
    queryFn: async (): Promise<AdminMemberRow[]> => {
      let query = supabase
        .from('profiles')
        .select(
          'id, email, display_name, first_name, last_name, role, membership_status, can_upload_media, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(100);

      const q = search.trim();
      if (q) {
        const pattern = `%${q}%`;
        query = query.or(
          `email.ilike.${pattern},display_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminMember(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['admin-member', id],
    enabled: enabled && Boolean(id),
    queryFn: async (): Promise<Profile | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateMemberAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      role: UserRole;
      membership_status: MembershipStatus;
      can_upload_media: boolean;
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          role: args.role,
          membership_status: args.membership_status,
          can_upload_media: args.can_upload_media,
        })
        .eq('id', args.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ['admin-members'] });
      await qc.invalidateQueries({ queryKey: ['admin-member', data.id] });
      await qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });
}
