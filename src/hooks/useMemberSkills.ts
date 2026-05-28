import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import { z } from 'zod';

// Types matching the database schema
export type VolunteerRole = 'vocalist' | 'instrumentalist' | 'technician';

export interface MemberSkills {
  id: string;
  member_id: string;
  volunteer_role: VolunteerRole;
  instrument: string | null;
  skills: string[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export interface MemberWithSkills extends OrganizationMember {
  skills: MemberSkills | null;
  profile: {
    name: string;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export const roleLabels: Record<VolunteerRole, string> = {
  vocalist: 'Vocal',
  instrumentalist: 'Instrumentista',
  technician: 'Técnico',
};

// Zod schema for skills validation
export const MemberSkillsSchema = z.object({
  volunteer_role: z.enum(['vocalist', 'instrumentalist', 'technician'], {
    errorMap: () => ({ message: 'Função inválida' })
  }),
  instrument: z.string()
    .max(50, 'Instrumento deve ter no máximo 50 caracteres')
    .nullable()
    .optional()
    .transform(val => val || null),
  skills: z.array(z.string().max(50, 'Habilidade deve ter no máximo 50 caracteres'))
    .max(20, 'Máximo de 20 habilidades')
    .optional()
    .default([]),
});

/**
 * Hook to get the current user's member record and skills for the active organization
 */
export function useMyMemberSkills() {
  const { user } = useAuth();
  const { activeOrgId } = useOrganization();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-member-skills', user?.id, activeOrgId],
    queryFn: async () => {
      if (!user?.id || !activeOrgId) return null;

      // Get the member record for current user in active org
      const { data: member, error: memberError } = await supabase
        .from('organization_members')
        .select('id, user_id, organization_id, role, created_at')
        .eq('user_id', user.id)
        .eq('organization_id', activeOrgId)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!member) return null;

      // Get skills for this member
      const { data: skills, error: skillsError } = await supabase
        .from('member_skills')
        .select('*')
        .eq('member_id', member.id)
        .maybeSingle();

      if (skillsError) throw skillsError;

      return {
        member: member as OrganizationMember,
        skills: skills as MemberSkills | null,
        needsOnboarding: !skills?.completed_at,
      };
    },
    enabled: !!user?.id && !!activeOrgId,
  });

  return {
    member: data?.member || null,
    skills: data?.skills || null,
    needsOnboarding: data?.needsOnboarding ?? false,
    isLoading,
    refetch,
  };
}

/**
 * Hook to update the current user's skills (for onboarding)
 */
export function useUpdateMySkills() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeOrgId } = useOrganization();

  return useMutation({
    mutationFn: async (data: {
      volunteer_role: VolunteerRole;
      instrument?: string | null;
      skills?: string[];
    }) => {
      if (!user?.id || !activeOrgId) throw new Error('Usuário não autenticado');

      // Validate input
      const validated = MemberSkillsSchema.parse(data);

      // Get member ID
      const { data: member, error: memberError } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', activeOrgId)
        .single();

      if (memberError) throw memberError;

      // Upsert skills
      const { data: result, error } = await supabase
        .from('member_skills')
        .upsert({
          member_id: member.id,
          volunteer_role: validated.volunteer_role,
          instrument: validated.instrument,
          skills: validated.skills,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'member_id',
        })
        .select()
        .single();

      if (error) throw error;
      return result as MemberSkills;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-member-skills'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members-with-skills'] });
      toast.success('Habilidades salvas com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar habilidades: ${error.message}`);
    },
  });
}

/**
 * Hook to get all members with their skills for the active organization
 * Used for scheduling/selecting team members
 */
export function useOrganizationMembersWithSkills() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['organization-members-with-skills', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Get all members (only real members with user_id)
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('id, user_id, organization_id, role, created_at')
        .eq('organization_id', organization.id);

      if (membersError) throw membersError;

      // Get all skills for these members
      const memberIds = members.map(m => m.id);
      const { data: allSkills, error: skillsError } = await supabase
        .from('member_skills')
        .select('*')
        .in('member_id', memberIds);

      if (skillsError) throw skillsError;

      // Get profiles for all members
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine data
      return members.map(member => {
        const skills = allSkills?.find(s => s.member_id === member.id) || null;
        const profile = profiles?.find(p => p.user_id === member.user_id) || null;

        return {
          ...member,
          skills,
          profile,
        } as MemberWithSkills;
      });
    },
    enabled: !!organization?.id,
  });
}

/**
 * Hook to update a member's skills (for admins)
 */
export function useUpdateMemberSkills() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      memberId, 
      ...data 
    }: {
      memberId: string;
      volunteer_role: VolunteerRole;
      instrument?: string | null;
      skills?: string[];
    }) => {
      // Validate input
      const validated = MemberSkillsSchema.parse(data);

      const { data: result, error } = await supabase
        .from('member_skills')
        .upsert({
          member_id: memberId,
          volunteer_role: validated.volunteer_role,
          instrument: validated.instrument,
          skills: validated.skills,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'member_id',
        })
        .select()
        .single();

      if (error) throw error;
      return result as MemberSkills;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members-with-skills'] });
      toast.success('Habilidades atualizadas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

/**
 * Hook to get unavailability using member_id
 */
export function useMemberUnavailability(date?: Date) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['member-unavailability', organization?.id, date?.toISOString()],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('unavailability')
        .select('id, member_id, date, reason, created_at')
        .not('member_id', 'is', null);

      if (date) {
        query = query.eq('date', date.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by organization
      const { data: members } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organization.id);

      const memberIds = new Set(members?.map(m => m.id) || []);
      return (data || []).filter(u => u.member_id && memberIds.has(u.member_id));
    },
    enabled: !!organization?.id,
  });
}

/**
 * Hook to add unavailability for a member
 */
export function useAddMemberUnavailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { member_id: string; date: string; reason?: string }) => {
      const { data: result, error } = await supabase
        .from('unavailability')
        .insert({
          member_id: data.member_id,
          date: data.date,
          reason: data.reason || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-unavailability'] });
      queryClient.invalidateQueries({ queryKey: ['all-member-unavailability'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

/**
 * Hook to delete unavailability
 */
export function useDeleteMemberUnavailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('unavailability')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-unavailability'] });
      toast.success('Indisponibilidade removida!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

/**
 * Hook to get member service counts (for fatigue calculation)
 */
export function useMemberServiceCounts(days: number = 30) {
  const { organization } = useOrganization();
  
  return useQuery({
    queryKey: ['member-service-counts', organization?.id, days],
    queryFn: async () => {
      if (!organization?.id) return {} as Record<string, number>;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Get services in date range for this org
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('organization_id', organization.id)
        .gte('date', startDateStr);

      if (servicesError) throw servicesError;

      const serviceIds = (services || []).map(s => s.id);
      if (serviceIds.length === 0) return {};

      // Get service_volunteers using member_id
      const { data: serviceVolunteers, error: svError } = await supabase
        .from('service_volunteers')
        .select('member_id')
        .in('service_id', serviceIds)
        .not('member_id', 'is', null);

      if (svError) throw svError;

      // Count per member
      const counts: Record<string, number> = {};
      (serviceVolunteers || []).forEach(sv => {
        if (sv.member_id) {
          counts[sv.member_id] = (counts[sv.member_id] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: !!organization?.id,
  });
}
