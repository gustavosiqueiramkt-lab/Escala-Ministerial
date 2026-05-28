import { useOrganizationMembersWithSkills, MemberWithSkills, roleLabels } from '@/hooks/useMemberSkills';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Mic, Music, Settings, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceVolunteer {
  id: string;
  member_id: string | null;
  status: string;
}

interface TeamSectionProps {
  serviceVolunteers: ServiceVolunteer[];
  members?: MemberWithSkills[];
}

const roleIcons = {
  vocalist: Mic,
  instrumentalist: Music,
  technician: Settings,
};

const roleColors = {
  vocalist: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  instrumentalist: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  technician: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
};

const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle2,
  declined: XCircle,
};

const statusColors = {
  pending: 'text-amber-500',
  confirmed: 'text-green-500',
  declined: 'text-red-500',
};

export function TeamSection({ serviceVolunteers, members: propMembers }: TeamSectionProps) {
  const { data: fetchedMembers = [] } = useOrganizationMembersWithSkills();
  const members = propMembers || fetchedMembers;

  // Group members by role
  const groupedTeam = serviceVolunteers.reduce((acc, sv) => {
    const member = members.find(m => m.id === sv.member_id);
    if (!member) return acc;
    
    const role = member.skills?.volunteer_role || 'vocalist';
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push({ 
      ...member, 
      status: sv.status,
      displayName: member.profile?.name || 'Membro',
      displayInstrument: member.skills?.instrument,
      displayAvatar: member.profile?.avatar_url,
    });
    return acc;
  }, {} as Record<string, (MemberWithSkills & { status: string; displayName: string; displayInstrument?: string | null; displayAvatar?: string | null })[]>);

  const roleOrder = ['vocalist', 'instrumentalist', 'technician'] as const;

  if (serviceVolunteers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>Nenhum membro escalado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {roleOrder.map(role => {
        const teamMembers = groupedTeam[role];
        if (!teamMembers?.length) return null;

        const RoleIcon = roleIcons[role];

        return (
          <div key={role} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <RoleIcon className="h-4 w-4" />
              {roleLabels[role]}s
            </div>
            <div className="grid gap-2">
              {teamMembers.map((member) => {
                const StatusIcon = statusIcons[member.status as keyof typeof statusIcons] || Clock;
                const statusColor = statusColors[member.status as keyof typeof statusColors] || 'text-muted-foreground';

                return (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border',
                      roleColors[role]
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={member.displayAvatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.displayName}</p>
                      {member.displayInstrument && (
                        <p className="text-xs opacity-70">{member.displayInstrument}</p>
                      )}
                    </div>
                    <StatusIcon className={cn('h-5 w-5 shrink-0', statusColor)} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
