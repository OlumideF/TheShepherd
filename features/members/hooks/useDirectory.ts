import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import type { DirectoryMember } from '@/lib/supabase/types';

export function useDirectory(search: string) {
  const trimmed = search.trim();

  return useQuery({
    queryKey: ['member-directory', trimmed],
    queryFn: async (): Promise<DirectoryMember[]> => {
      let query = supabase
        .from('member_directory')
        .select('*')
        .order('display_name', { ascending: true })
        .limit(50);

      if (trimmed.length > 0) {
        const pattern = `%${trimmed}%`;
        query = query.or(
          `display_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDirectoryMember(id: string | undefined) {
  return useQuery({
    queryKey: ['member-directory', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<DirectoryMember | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('member_directory')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
