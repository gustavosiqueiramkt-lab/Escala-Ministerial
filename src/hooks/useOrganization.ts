import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  profile?: {
    name: string;
    email: string | null;
    avatar_url: string | null;
  };
}

interface OrganizationMembership {
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  organization: Organization;
}

// Store for selected organization (persisted)
interface OrgStore {
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string | null) => void;
}

export const useOrgStore = create<OrgStore>()(
  persist(
    (set) => ({
      selectedOrgId: null,
      setSelectedOrgId: (id) => set({ selectedOrgId: id }),
    }),
    { name: 'selected-org' }
  )
);

// Hook to get user's organizations and manage selection
export function useOrganization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { selectedOrgId, setSelectedOrgId } = useOrgStore();

  // Fetch all user's organization memberships
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['org-memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;
      if (!membershipData || membershipData.length === 0) return [];

      // Get all organization details
      const orgIds = membershipData.map(m => m.organization_id);
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (orgsError) throw orgsError;

      return membershipData.map(m => ({
        organization_id: m.organization_id,
        role: m.role as 'owner' | 'admin' | 'member',
        organization: orgs?.find(o => o.id === m.organization_id) as Organization,
      })).filter(m => m.organization) as OrganizationMembership[];
    },
    enabled: !!user?.id,
  });

  const activeOrgId =
    selectedOrgId ??
    (memberships.length === 1 ? memberships[0].organization_id : null);

  // Current organization (requires explicit selection when user has multiple orgs)
  const organization =
    memberships.length === 0
      ? null
      : activeOrgId
        ? memberships.find((m) => m.organization_id === activeOrgId)?.organization ?? null
        : null;

  const needsSelection =
    !membershipsLoading && memberships.length > 1 && !selectedOrgId;

  // Auto-select when the user only has ONE org
  useEffect(() => {
    if (!membershipsLoading && memberships.length === 1 && !selectedOrgId) {
      setSelectedOrgId(memberships[0].organization_id);
    }
  }, [membershipsLoading, memberships, selectedOrgId, setSelectedOrgId]);

  // Setup initial organization using RPC (SECURITY DEFINER - bypasses RLS)
  const setupOrganization = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if organization with this name already exists
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id, name')
        .ilike('name', name.trim())
        .maybeSingle();

      if (existingOrg) {
        throw new Error('DUPLICATE_ORG');
      }

      // Use RPC function that creates org + owner membership in single transaction
      const { data: orgId, error } = await supabase
        .rpc('create_organization_with_owner', {
          org_name: name,
          org_slug: slug,
          org_logo_url: null,
        });

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error('DUPLICATE_ORG');
        }
        throw error;
      }

      // Fetch the created organization
      const { data: org, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (fetchError) throw fetchError;

      return org as Organization;
    },
    onSuccess: (org) => {
      setSelectedOrgId(org.id);
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['org-memberships'] });
      toast.success('Organização criada com sucesso!');
    },
    onError: (error) => {
      if (error.message === 'DUPLICATE_ORG') {
        toast.error('Esta organização já existe. Solicite o acesso ao administrador ou verifique o convite.');
      } else {
        toast.error(`Erro ao criar organização: ${error.message}`);
      }
    },
  });

  // Check and process pending invites for current user
  const checkPendingInvites = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('check_and_process_my_invites');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-memberships'] });
    },
  });

  return {
    organization,
    activeOrgId,
    organizations: memberships.map((m) => m.organization),
    memberships,
    isLoading: membershipsLoading,
    setupOrganization,
    checkPendingInvites,
    needsSetup: !membershipsLoading && memberships.length === 0,
    needsSelection,
    selectedOrgId,
    setSelectedOrgId,
    hasMultipleOrgs: memberships.length > 1,
  };
}

// Hook to manage organization members
export function useOrganizationMembers() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['organization-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          organization_id,
          role,
          created_at
        `)
        .eq('organization_id', organization.id);

      if (error) throw error;

      // Get profiles for each member
      const userIds = data.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Merge profiles with members
      return data.map(member => ({
        ...member,
        role: member.role as 'owner' | 'admin' | 'member',
        profile: profiles?.find(p => p.user_id === member.user_id) || {
          name: 'Usuário',
          email: null,
          avatar_url: null,
        },
      })) as OrganizationMember[];
    },
    enabled: !!organization?.id,
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'owner' | 'admin' | 'member' }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Função atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar função: ${error.message}`);
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Membro removido com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao remover membro: ${error.message}`);
    },
  });

  const inviteMember = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'member' }) => {
      if (!organization?.id) throw new Error('No organization');

      // First, find the user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        // User exists - add directly to organization
        // Check if already a member
        const { data: existing } = await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('user_id', profile.user_id)
          .maybeSingle();

        if (existing) {
          throw new Error('Este usuário já é membro da organização.');
        }

        // Add as member
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: organization.id,
            user_id: profile.user_id,
            role,
          });

        if (memberError) throw memberError;
        
        return { type: 'direct' as const };
      } else {
        // User doesn't exist - create pending invite
        // Check if already invited
        const { data: existingInvite } = await supabase
          .from('pending_invites')
          .select('id')
          .eq('organization_id', organization.id)
          .ilike('email', email.trim())
          .maybeSingle();

        if (existingInvite) {
          throw new Error('Este e-mail já foi convidado. Aguarde o usuário criar a conta.');
        }

        // Get current user id for invited_by
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) throw new Error('Usuário não autenticado');

        const { error: inviteError } = await supabase
          .from('pending_invites')
          .insert({
            organization_id: organization.id,
            email: email.toLowerCase().trim(),
            role,
            invited_by: currentUser.id,
          });

        if (inviteError) throw inviteError;
        
        return { type: 'pending' as const };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      if (result.type === 'direct') {
        toast.success('Membro adicionado com sucesso!');
      } else {
        toast.success('Convite enviado! O usuário será adicionado quando criar a conta.');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Fetch pending invites
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pending-invites', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('pending_invites')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });

  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('pending_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      toast.success('Convite cancelado.');
    },
    onError: (error) => {
      toast.error(`Erro ao cancelar convite: ${error.message}`);
    },
  });

  return {
    members,
    isLoading,
    updateMemberRole,
    removeMember,
    inviteMember,
    pendingInvites,
    cancelInvite,
  };
}
