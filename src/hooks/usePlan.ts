import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { PLAN_LIMITS, type PlanId } from '@/lib/planLimits';

export function usePlan() {
  const { organization } = useOrganization();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['organization_subscription', organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select('plan_id, status, current_period_end')
        .eq('organization_id', organization!.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const planId = (subscription?.plan_id ?? 'free') as PlanId;
  const limits = PLAN_LIMITS[planId];

  return {
    planId,
    limits,
    isLoading,
    isActive: subscription?.status === 'active',
  };
}
