import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

/**
 * Hook to get member service counts in the last N days
 * Used for calculating fatigue (3+ services in 30 days)
 */
export function useMemberServiceCounts(days: number = 30) {
  return useQuery({
    queryKey: ['member-service-counts', days],
    queryFn: async () => {
      const startDate = subDays(new Date(), days).toISOString().split('T')[0];
      
      // Get all services in the date range
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, date')
        .gte('date', startDate);

      if (servicesError) throw servicesError;

      const serviceIds = (services || []).map(s => s.id);
      
      if (serviceIds.length === 0) {
        return {} as Record<string, number>;
      }

      // Get all service_volunteers for these services using member_id
      const { data: serviceVolunteers, error: svError } = await supabase
        .from('service_volunteers')
        .select('member_id')
        .in('service_id', serviceIds)
        .not('member_id', 'is', null);

      if (svError) throw svError;

      // Count services per member
      const counts: Record<string, number> = {};
      (serviceVolunteers || []).forEach(sv => {
        if (sv.member_id) {
          counts[sv.member_id] = (counts[sv.member_id] || 0) + 1;
        }
      });

      return counts;
    },
  });
}

/**
 * Check if a member has fatigue (3+ services in the last 30 days)
 */
export function useMemberFatigue(memberId: string | undefined) {
  const { data: counts = {} } = useMemberServiceCounts(30);
  
  if (!memberId) return { hasFatigue: false, serviceCount: 0 };
  
  const count = counts[memberId] || 0;
  return {
    hasFatigue: count >= 3,
    serviceCount: count,
  };
}

// Legacy exports for backward compatibility (deprecated)
export const useVolunteerServiceCounts = useMemberServiceCounts;
export const useVolunteerFatigue = useMemberFatigue;
