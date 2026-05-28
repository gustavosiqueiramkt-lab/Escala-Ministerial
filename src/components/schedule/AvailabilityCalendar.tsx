import { useState, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useOrgRole, useVolunteerStatus } from '@/hooks/useOrgRole';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  useOrganizationMembersWithSkills, 
  useAddMemberUnavailability, 
  useDeleteMemberUnavailability,
  roleLabels,
} from '@/hooks/useMemberSkills';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarOff, Loader2, CalendarX2, Trash2, Users, Shield } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Parse date string YYYY-MM-DD without timezone conversion
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Check if date string matches a Date object
function isSameDateString(dateStr: string, date: Date): boolean {
  const parsed = parseDateString(dateStr);
  return parsed.getFullYear() === date.getFullYear() &&
         parsed.getMonth() === date.getMonth() &&
         parsed.getDate() === date.getDate();
}

interface Unavailability {
  id: string;
  member_id: string;
  date: string;
  reason: string | null;
  created_at: string;
}

// Hook to get all unavailability for the organization using member_id
function useAllMemberUnavailability() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['all-member-unavailability', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Get all members of this organization
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organization.id);

      if (membersError) throw membersError;
      const memberIds = (members || []).map(m => m.id);
      
      if (memberIds.length === 0) return [];

      // Get unavailability for these members
      const { data, error } = await supabase
        .from('unavailability')
        .select('id, member_id, date, reason, created_at')
        .in('member_id', memberIds)
        .order('date');

      if (error) throw error;
      return (data || []) as Unavailability[];
    },
    enabled: !!organization?.id,
  });
}

export function AvailabilityCalendar() {
  const { user } = useAuth();
  const { isLeader, isLoading: roleLoading } = useOrgRole();
  const { volunteer, isLoading: volunteerLoading } = useVolunteerStatus();
  const { data: allMembers = [], isLoading: membersLoading } = useOrganizationMembersWithSkills();
  const { data: unavailabilities = [], isLoading: unavailabilityLoading } = useAllMemberUnavailability();
  const addUnavailability = useAddMemberUnavailability();
  const deleteUnavailability = useDeleteMemberUnavailability();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  
  // Admin mode: select which member to manage
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal');

  const isLoading = roleLoading || volunteerLoading;
  const isDataLoading = membersLoading || unavailabilityLoading;

  // Current user's member_id
  const myMemberId = volunteer?.memberId || null;

  // Determine which member ID to use based on view mode
  const activeMemberId = viewMode === 'personal' 
    ? myMemberId 
    : selectedMemberId;

  // Filter unavailabilities based on view mode
  const displayedUnavailabilities = viewMode === 'team'
    ? unavailabilities // Show all in team view
    : unavailabilities.filter(u => u.member_id === myMemberId);

  // For personal calendar styling
  const myUnavailabilities = myMemberId 
    ? unavailabilities.filter(u => u.member_id === myMemberId)
    : [];

  // Filter members with completed skills for the selector
  const realMembers = allMembers.filter(m => m.skills?.completed_at);

  // Handle tab change safely
  const handleViewModeChange = useCallback((mode: 'personal' | 'team') => {
    setViewMode(mode);
    // Reset member selection when switching to team mode
    if (mode === 'team') {
      setSelectedMemberId(null);
    }
  }, []);

  const handleDayClick = (date: Date | undefined) => {
    if (!date) return;
    
    // In personal mode, must have member
    if (viewMode === 'personal' && !myMemberId) {
      toast.error('Você precisa completar seu perfil para marcar disponibilidade.');
      return;
    }
    
    // In team mode, must have selected a member
    if (viewMode === 'team' && !selectedMemberId) {
      toast.error('Selecione um membro para gerenciar.');
      return;
    }

    const targetMemberId = activeMemberId;
    if (!targetMemberId) {
      return;
    }

    const existing = unavailabilities.find(u => 
      u.member_id === targetMemberId && isSameDateString(u.date, date)
    );

    if (existing) {
      // Remove unavailability
      deleteUnavailability.mutate(existing.id, {
        onSuccess: () => {
          toast.success('Disponibilidade restaurada!');
          queryClient.invalidateQueries({ queryKey: ['all-member-unavailability'] });
        },
        onError: (err) => toast.error(`Erro: ${err.message}`),
      });
    } else {
      // Open dialog to add unavailability
      setSelectedDate(date);
      setReason('');
      setDialogOpen(true);
    }
  };

  const handleAddUnavailability = () => {
    const targetMemberId = activeMemberId;
    if (!selectedDate || !targetMemberId) return;

    addUnavailability.mutate({
      member_id: targetMemberId,
      date: format(selectedDate, 'yyyy-MM-dd'),
      reason: reason || undefined,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setSelectedDate(undefined);
        setReason('');
        toast.success('Indisponibilidade marcada!');
        queryClient.invalidateQueries({ queryKey: ['all-member-unavailability'] });
      },
      onError: (err) => {
        toast.error(`Erro ao salvar: ${err.message}`);
      },
    });
  };

  // Custom day renderer - check if day is unavailable
  const isDayUnavailable = (date: Date) => {
    if (viewMode === 'team' && selectedMemberId) {
      return unavailabilities.some(u => 
        u.member_id === selectedMemberId && isSameDateString(u.date, date)
      );
    }
    return myUnavailabilities.some(u => isSameDateString(u.date, date));
  };

  // Get member display name
  const getMemberName = (memberId: string) => {
    const member = allMembers.find(m => m.id === memberId);
    if (!member) return 'Membro';
    return member.profile?.name || 'Membro';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If member record doesn't exist yet (edge case)
  if (!myMemberId) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarOff className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Carregando seu perfil de membro...
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Se o problema persistir, recarregue a página.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarX2 className="h-5 w-5 text-primary" />
              {isLeader ? 'Gerenciar Disponibilidade' : 'Minha Disponibilidade'}
            </CardTitle>
            <CardDescription>
              {isLeader 
                ? 'Visualize e gerencie a disponibilidade da equipe'
                : 'Toque em uma data para marcar como indisponível'}
            </CardDescription>
          </div>
          {isLeader && (
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Líder
            </Badge>
          )}
        </div>

        {/* Leader View Mode Toggle */}
        {isLeader && (
          <div className="flex gap-2 mt-4">
            <Button
              variant={viewMode === 'personal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewModeChange('personal')}
              className="flex-1"
            >
              Minha Agenda
            </Button>
            <Button
              variant={viewMode === 'team' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewModeChange('team')}
              className="flex-1 gap-2"
            >
              <Users className="h-4 w-4" />
              Equipe
            </Button>
          </div>
        )}

        {/* Member Selector (Team View) */}
        {isLeader && viewMode === 'team' && (
          <div className="mt-3">
            {isDataLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Carregando membros...</span>
              </div>
            ) : (
              <Select
                value={selectedMemberId || ''}
                onValueChange={(val) => setSelectedMemberId(val || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um membro para gerenciar" />
                </SelectTrigger>
                <SelectContent>
                  {realMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.profile?.name || 'Membro'} • {m.skills ? roleLabels[m.skills.volunteer_role] : 'Sem função'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isDataLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDayClick}
              locale={ptBR}
              className="rounded-xl border p-3 pointer-events-auto"
              modifiers={{
                unavailable: (date) => isDayUnavailable(date),
              }}
              modifiersClassNames={{
                unavailable: 'bg-red-100 text-red-600 font-bold hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400',
              }}
              disabled={(date) => {
                // Disable past dates
                if (date < startOfDay(new Date())) return true;
                // In team view without member selected, disable all
                if (viewMode === 'team' && !selectedMemberId) return true;
                return false;
              }}
            />

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30" />
                <span>Indisponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary/10" />
                <span>Disponível</span>
              </div>
            </div>

            {/* Upcoming Unavailabilities List */}
            {displayedUnavailabilities.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">
                  {viewMode === 'team' 
                    ? 'Próximas indisponibilidades da equipe:' 
                    : 'Suas próximas indisponibilidades:'}
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {displayedUnavailabilities
                    .filter(u => parseDateString(u.date) >= startOfDay(new Date()))
                    .sort((a, b) => parseDateString(a.date).getTime() - parseDateString(b.date).getTime())
                    .slice(0, viewMode === 'team' ? 10 : 5)
                    .map(u => {
                      const canDelete = isLeader || u.member_id === myMemberId;

                      return (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            {viewMode === 'team' && (
                              <span className="font-medium text-foreground truncate block">
                                {getMemberName(u.member_id)}
                              </span>
                            )}
                            <span className={cn(
                              viewMode === 'team' ? 'text-muted-foreground' : 'font-medium'
                            )}>
                              {format(parseDateString(u.date), "d 'de' MMMM", { locale: ptBR })}
                            </span>
                            {u.reason && (
                              <span className="text-muted-foreground ml-2">• {u.reason}</span>
                            )}
                          </div>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 shrink-0"
                              onClick={() => {
                                deleteUnavailability.mutate(u.id, {
                                  onSuccess: () => {
                                    queryClient.invalidateQueries({ queryKey: ['all-member-unavailability'] });
                                  }
                                });
                              }}
                              disabled={deleteUnavailability.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Add Unavailability Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarX2 className="h-5 w-5 text-red-500" />
              Marcar Indisponibilidade
            </DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <span className="font-medium text-foreground">
                  {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              )}
              {viewMode === 'team' && selectedMemberId && (
                <span className="block mt-1">
                  Membro: <strong>{getMemberName(selectedMemberId)}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Motivo (opcional): Ex: Viagem, compromisso familiar..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px]"
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddUnavailability}
              disabled={addUnavailability.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {addUnavailability.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Indisponibilidade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
