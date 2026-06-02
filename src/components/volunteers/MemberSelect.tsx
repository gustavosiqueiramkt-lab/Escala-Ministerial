import { useState, useMemo } from 'react';
import { 
  useOrganizationMembersWithSkills, 
  useMemberUnavailability, 
  useMemberServiceCounts,
  MemberWithSkills,
  roleLabels,
  VolunteerRole
} from '@/hooks/useMemberSkills';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, X, Search, Flame, Music, Mic, Settings, ChevronDown } from 'lucide-react';
import { isSameDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MemberSelectProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
  serviceDate: Date;
  filterRole?: VolunteerRole;
}

const roleIcons = {
  vocalist: Mic,
  instrumentalist: Music,
  technician: Settings,
};

const roleColors = {
  vocalist: 'bg-pink-500/10 text-pink-600 border-pink-500/30',
  instrumentalist: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  technician: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
};

function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function MemberSelect({ selectedIds, onToggle, serviceDate, filterRole }: MemberSelectProps) {
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembersWithSkills();
  const { data: unavailability = [] } = useMemberUnavailability();
  const { data: serviceCounts = {} } = useMemberServiceCounts(30);
  const [search, setSearch] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    vocalist: true,
    instrumentalist: true,
    technician: true,
  });

  // Get member name from profile
  const getMemberName = (member: MemberWithSkills): string => {
    return member.profile?.name || 'Membro';
  };

  const getMemberStatus = (member: MemberWithSkills) => {
    const isUnavailable = unavailability.some(
      (u) => u.member_id === member.id && isSameDay(parseDateString(u.date), serviceDate)
    );
    
    // Use service count from the last 30 days for fatigue calculation
    const servicesLast30Days = serviceCounts[member.id] || 0;
    const hasConsecutiveAlert = servicesLast30Days >= 3;
    const fatigueLevel = servicesLast30Days >= 4 ? 'critical' : servicesLast30Days >= 3 ? 'warning' : 'normal';
    
    return { isUnavailable, hasConsecutiveAlert, fatigueLevel, servicesLast30Days };
  };

  // Check if member has completed onboarding
  const hasSkills = (member: MemberWithSkills) => !!member.skills?.completed_at;

  const filteredMembers = useMemo(() => {
    let result = [...members];
    
    // Filter by role if specified (only members with skills)
    if (filterRole) {
      result = result.filter(m => m.skills?.volunteer_role === filterRole);
    }
    
    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(m => {
        const name = getMemberName(m);
        const instrument = m.skills?.instrument || '';
        const skills = m.skills?.skills || [];
        return (
          name.toLowerCase().includes(searchLower) ||
          instrument.toLowerCase().includes(searchLower) ||
          skills.some(s => s.toLowerCase().includes(searchLower))
        );
      });
    }
    
    return result;
  }, [members, search, filterRole]);

  const groupedMembers = useMemo(() => {
    const groups: Record<VolunteerRole | 'noSkills', MemberWithSkills[]> = {
      vocalist: [],
      instrumentalist: [],
      technician: [],
      noSkills: [],
    };
    
    filteredMembers.forEach(m => {
      if (!hasSkills(m)) {
        groups.noSkills.push(m);
      } else {
        const role = m.skills?.volunteer_role || 'vocalist';
        groups[role].push(m);
      }
    });
    
    // Sort each group: available first, then by service count (ascending = less fatigued first)
    (['vocalist', 'instrumentalist', 'technician'] as VolunteerRole[]).forEach(role => {
      groups[role].sort((a, b) => {
        const statusA = getMemberStatus(a);
        const statusB = getMemberStatus(b);
        
        if (statusA.isUnavailable !== statusB.isUnavailable) {
          return statusA.isUnavailable ? 1 : -1;
        }
        
        return statusA.servicesLast30Days - statusB.servicesLast30Days;
      });
    });
    
    // Sort noSkills by name
    groups.noSkills.sort((a, b) => getMemberName(a).localeCompare(getMemberName(b)));
    
    return groups;
  }, [filteredMembers, unavailability, serviceDate, serviceCounts]);

  const toggleSection = (role: string) => {
    setOpenSections(prev => ({ ...prev, [role]: !prev[role] }));
  };

  if (membersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar membros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Grouped Members by Role */}
        {(Object.entries(groupedMembers) as [VolunteerRole | 'noSkills', MemberWithSkills[]][])
          .filter(([role]) => role !== 'noSkills')
          .map(([role, roleMembers]) => {
            if (roleMembers.length === 0) return null;
            
            const RoleIcon = roleIcons[role as VolunteerRole];
            const selectedCount = roleMembers.filter(m => selectedIds.includes(m.id)).length;
            
            return (
              <Collapsible
                key={role}
                open={openSections[role]}
                onOpenChange={() => toggleSection(role)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', roleColors[role as VolunteerRole])}>
                      <RoleIcon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{roleLabels[role as VolunteerRole]}</span>
                    <Badge variant="secondary" className="ml-2">
                      {roleMembers.length}
                    </Badge>
                    {selectedCount > 0 && (
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    openSections[role] && 'rotate-180'
                  )} />
                </CollapsibleTrigger>
                
                <CollapsibleContent className="pt-3">
                  <div className="grid grid-cols-1 gap-2">
                    {roleMembers.map((member) => {
                      const { isUnavailable, hasConsecutiveAlert, fatigueLevel, servicesLast30Days } = getMemberStatus(member);
                      const isSelected = selectedIds.includes(member.id);
                      const memberName = getMemberName(member);

                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => !isUnavailable && onToggle(member.id)}
                          disabled={isUnavailable}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200',
                            isUnavailable
                              ? 'opacity-50 cursor-not-allowed bg-muted/50 border-muted'
                              : isSelected
                              ? 'border-primary bg-primary/5 shadow-md'
                              : 'border-border hover:border-primary/50 hover:bg-secondary/30'
                          )}
                        >
                          {/* Selection indicator */}
                          <div
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                              isSelected
                                ? 'border-primary bg-primary'
                                : isUnavailable
                                ? 'border-muted-foreground/30'
                                : 'border-muted-foreground/50'
                            )}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                            {isUnavailable && !isSelected && <X className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>

                          {/* Member info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{memberName}</span>
                              {member.skills?.instrument && (
                                <span className="text-sm text-muted-foreground">
                                  ({member.skills.instrument})
                                </span>
                              )}
                            </div>
                            
                            {/* Skills */}
                            {(member.skills?.skills || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(member.skills?.skills || []).slice(0, 2).map((skill) => (
                                  <Badge key={skill} variant="outline" className="text-xs py-0">
                                    {skill}
                                  </Badge>
                                ))}
                                {(member.skills?.skills || []).length > 2 && (
                                  <Badge variant="outline" className="text-xs py-0">
                                    +{(member.skills?.skills || []).length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Status indicators */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isUnavailable && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-600 border border-red-500/30">
                                    <X className="h-3 w-3" />
                                    Indisponível
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Marcou indisponibilidade para esta data</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            
                            {hasConsecutiveAlert && !isUnavailable && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={cn(
                                    'flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium',
                                    fatigueLevel === 'critical' 
                                      ? 'bg-red-500/10 text-red-600 border-red-500/30' 
                                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                  )}>
                                    <Flame className="h-3 w-3" />
                                    {servicesLast30Days} cultos
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-semibold">
                                    {fatigueLevel === 'critical' ? '⚠️ Fadiga Crítica!' : '⚡ Alerta de Fadiga'}
                                  </p>
                                  <p className="text-xs">
                                    {servicesLast30Days} cultos nos últimos 30 dias.
                                    {fatigueLevel === 'critical' && ' Considere dar uma folga.'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

        {/* Members without skills */}
        {groupedMembers.noSkills.length > 0 && (
          <Collapsible
            open={openSections['noSkills']}
            onOpenChange={() => toggleSection('noSkills')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors border border-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <span className="font-medium text-amber-700">Sem habilidades definidas</span>
                <Badge variant="outline" className="ml-2 border-amber-500/30 text-amber-600">
                  {groupedMembers.noSkills.length}
                </Badge>
              </div>
              <ChevronDown className={cn(
                'h-4 w-4 text-amber-600 transition-transform',
                openSections['noSkills'] && 'rotate-180'
              )} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 gap-2">
                {groupedMembers.noSkills.map((member) => {
                  const memberName = getMemberName(member);

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 opacity-60"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-amber-500/30">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{memberName}</span>
                          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600">
                            Sem habilidades definidas
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Este membro precisa preencher suas habilidades para ser escalado.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {filteredMembers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {search ? (
              <>
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum membro encontrado para "{search}"</p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum membro na organização.</p>
                <p className="text-sm">Convide membros na página de Gestão de Equipe.</p>
              </>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <span className="font-medium">Legenda:</span>
          <span className="flex items-center gap-1">
            <Flame className="h-3 w-3 text-amber-500" />
            3+ cultos (fadiga)
          </span>
          <span className="flex items-center gap-1">
            <X className="h-3 w-3 text-red-500" />
            Indisponível
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            Sem habilidades
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
