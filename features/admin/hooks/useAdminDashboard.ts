import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';

export type AdminDashboardStats = {
  memberCount: number;
  activeMemberCount: number;
  pendingMemberCount: number;
  upcomingEvents: {
    id: string;
    title: string;
    starts_at: string;
  }[];
  engagement: {
    rsvps7d: number;
    prayers7d: number;
    reactions7d: number;
  };
};

export function useAdminDashboard(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-dashboard'],
    enabled,
    queryFn: async (): Promise<AdminDashboardStats> => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const sinceIso = since.toISOString();

      const nowIso = new Date().toISOString();

      const [
        membersRes,
        activeRes,
        pendingRes,
        eventsRes,
        rsvpsRes,
        prayersRes,
        reactionsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('membership_status', 'active'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('membership_status', 'pending'),
        supabase
          .from('events')
          .select('id, title, starts_at')
          .eq('published', true)
          .gte('starts_at', nowIso)
          .order('starts_at', { ascending: true })
          .limit(8),
        supabase
          .from('event_rsvps')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sinceIso),
        supabase
          .from('prayer_requests')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sinceIso),
        supabase
          .from('announcement_reactions')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sinceIso),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (activeRes.error) throw activeRes.error;
      if (pendingRes.error) throw pendingRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (rsvpsRes.error) throw rsvpsRes.error;
      if (prayersRes.error) throw prayersRes.error;
      if (reactionsRes.error) throw reactionsRes.error;

      return {
        memberCount: membersRes.count ?? 0,
        activeMemberCount: activeRes.count ?? 0,
        pendingMemberCount: pendingRes.count ?? 0,
        upcomingEvents: eventsRes.data ?? [],
        engagement: {
          rsvps7d: rsvpsRes.count ?? 0,
          prayers7d: prayersRes.count ?? 0,
          reactions7d: reactionsRes.count ?? 0,
        },
      };
    },
  });
}
