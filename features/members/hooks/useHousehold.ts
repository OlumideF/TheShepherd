import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import type { Household, Profile } from '@/lib/supabase/types';

export function useHousehold() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const householdId = profile?.household_id ?? undefined;

  const householdQuery = useQuery({
    queryKey: ['household', householdId],
    enabled: Boolean(householdId),
    queryFn: async (): Promise<Household | null> => {
      if (!householdId) return null;
      const { data, error } = await supabase
        .from('households')
        .select('*')
        .eq('id', householdId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const membersQuery = useQuery({
    queryKey: ['household-members', householdId],
    enabled: Boolean(householdId),
    queryFn: async (): Promise<Profile[]> => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('household_id', householdId)
        .order('display_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createHousehold = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc('create_household', {
        p_name: name,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ['household'] });
      await queryClient.invalidateQueries({ queryKey: ['household-members'] });
    },
  });

  const joinHousehold = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('join_household_by_code', {
        p_code: code,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ['household'] });
      await queryClient.invalidateQueries({ queryKey: ['household-members'] });
    },
  });

  const leaveHousehold = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('leave_household');
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ['household'] });
      await queryClient.invalidateQueries({ queryKey: ['household-members'] });
    },
  });

  return {
    household: householdQuery.data ?? null,
    members: membersQuery.data ?? [],
    isLoading: householdQuery.isLoading || membersQuery.isLoading,
    createHousehold,
    joinHousehold,
    leaveHousehold,
  };
}
