import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';

export type OrgRole = 'owner' | 'admin' | 'member';

interface UseOrgRoleResult {
  isLoading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isLeader: boolean; // owner or admin
  isMember: boolean;
  role: OrgRole | null;
}

export function useOrgRole(): UseOrgRoleResult {
  const { memberships, selectedOrgId, isLoading } = useOrganization();

  const activeMembership =
    selectedOrgId
      ? memberships.find((m) => m.organization_id === selectedOrgId) ?? null
      : memberships.length === 1
        ? memberships[0]
        : null;

  const role = (activeMembership?.role as OrgRole) || null;

  return {
    isLoading,
    isAdmin: role === 'admin',
    isOwner: role === 'owner',
    isLeader: role === 'owner' || role === 'admin',
    isMember: !!role,
    role,
  };
}

/**
 * Hook to check if user has a member record with skills (replacing useVolunteerStatus)
 * This identifies the member_id for the current user in the active organization
 */
export function useVolunteerStatus() {
  const { user } = useAuth();
  const { activeOrgId } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ['my-member-status', user?.id, activeOrgId],
    queryFn: async () => {
      if (!user?.id || !activeOrgId) return null;

      // Get the member record for this user in the active organization
      const { data: member, error: memberError } = await supabase
        .from('organization_members')
        .select('id, user_id, organization_id, role')
        .eq('user_id', user.id)
        .eq('organization_id', activeOrgId)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!member) return null;

      // Get skills for this member
      const { data: skills, error: skillsError } = await supabase
        .from('member_skills')
        .select('id, volunteer_role, instrument, skills, completed_at')
        .eq('member_id', member.id)
        .maybeSingle();

      if (skillsError) throw skillsError;

      // Get profile for display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        id: member.id, // This is the member_id to use for scheduling
        memberId: member.id,
        name: profile?.name || 'Membro',
        role: skills?.volunteer_role || 'vocalist',
        instrument: skills?.instrument || null,
        skills: skills?.skills || [],
        hasCompletedOnboarding: !!skills?.completed_at,
      };
    },
    enabled: !!user?.id && !!activeOrgId,
  });

  return {
    isLoading,
    isVolunteer: !!data && data.hasCompletedOnboarding,
    volunteer: data,
  };
}
