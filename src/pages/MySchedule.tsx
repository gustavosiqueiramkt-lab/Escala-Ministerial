import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrgRole, useVolunteerStatus } from '@/hooks/useOrgRole';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvailabilityCalendar } from '@/components/schedule/AvailabilityCalendar';
import { ConfettiCelebration } from '@/components/ui/confetti-celebration';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Music,
  AlertTriangle,
  CalendarCheck,
  CalendarX2,
  Loader2,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { format, isFuture, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ServiceInvite {
  id: string;
  service_id: string;
  member_id: string;
  status: 'pending' | 'confirmed' | 'declined';
  created_at: string;
  service: {
    id: string;
    title: string;
    date: string;
    time: string;
    status: string;
  };
}

function useMyInvites() {
  const { user } = useAuth();
  const { activeOrgId } = useOrganization();

  return useQuery({
    queryKey: ['my-invites', user?.id, activeOrgId],
    queryFn: async () => {
      if (!user?.id || !activeOrgId) return [];

      // Get the member record for this user in the ACTIVE organization
      const { data: member, error: memberError } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', activeOrgId)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!member) return [];

      // Get service volunteers with service details using member_id
      const { data, error } = await supabase
        .from('service_volunteers')
        .select(
          `
          id,
          service_id,
          member_id,
          status,
          created_at,
          service:services(id, title, date, time, status)
        `
        )
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ServiceInvite[];
    },
    enabled: !!user?.id && !!activeOrgId,
  });
}

function useUpdateInviteStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      inviteId, 
      status, 
      declineReason 
    }: { 
      inviteId: string; 
      status: 'confirmed' | 'declined';
      declineReason?: string;
    }) => {
      const { error } = await supabase
        .from('service_volunteers')
        .update({ status })
        .eq('id', inviteId);

      if (error) throw error;
      return { status, declineReason };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-invites'] });
      // Toast will be handled by celebration component for confirmations
      if (data.status === 'declined') {
        toast.info('Convite recusado');
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

export default function MySchedule() {
  const navigate = useNavigate();
  const { data: invites = [], isLoading: invitesLoading } = useMyInvites();
  const { isLeader, isLoading: roleLoading } = useOrgRole();
  const { isVolunteer, isLoading: volunteerLoading } = useVolunteerStatus();
  const updateStatus = useUpdateInviteStatus();
  const [declineDialog, setDeclineDialog] = useState<{ open: boolean; inviteId: string | null }>({
    open: false,
    inviteId: null,
  });
  const [declineReason, setDeclineReason] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  const isLoading = invitesLoading || roleLoading || volunteerLoading;

  const handleConfirm = useCallback((inviteId: string) => {
    updateStatus.mutate({ inviteId, status: 'confirmed' }, {
      onSuccess: () => {
        setShowCelebration(true);
      },
    });
  }, [updateStatus]);

  const handleDeclineClick = (inviteId: string) => {
    setDeclineDialog({ open: true, inviteId });
    setDeclineReason('');
  };

  const handleDeclineConfirm = () => {
    if (declineDialog.inviteId) {
      updateStatus.mutate({ 
        inviteId: declineDialog.inviteId, 
        status: 'declined',
        declineReason: declineReason || undefined,
      });
      setDeclineDialog({ open: false, inviteId: null });
    }
  };

  // Separate invites into upcoming and past
  const upcomingInvites = invites.filter(invite => {
    const serviceDate = new Date(invite.service.date);
    return isFuture(serviceDate) || isToday(serviceDate);
  });

  const pastInvites = invites.filter(invite => {
    const serviceDate = new Date(invite.service.date);
    return !isFuture(serviceDate) && !isToday(serviceDate);
  });

  const pendingCount = upcomingInvites.filter(i => i.status === 'pending').length;

  const statusConfig = {
    pending: {
      label: 'Aguardando',
      icon: AlertTriangle,
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    },
    confirmed: {
      label: 'Confirmado',
      icon: CheckCircle2,
      className: 'bg-green-500/10 text-green-600 border-green-500/30',
    },
    declined: {
      label: 'Recusado',
      icon: XCircle,
      className: 'bg-red-500/10 text-red-600 border-red-500/30',
    },
  };

  if (isLoading) {
    return (
      <AppLayout title="Minha Agenda">
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Minha Agenda">
      {/* Confetti Celebration */}
      <ConfettiCelebration 
        show={showCelebration} 
        onComplete={() => setShowCelebration(false)} 
      />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <CalendarCheck className="h-12 w-12 mx-auto text-primary mb-3" />
          <h1 className="font-display text-2xl font-bold">Minha Agenda</h1>
          <p className="text-muted-foreground mt-1">
            {isLeader 
              ? 'Gerencie escalas e disponibilidade da equipe'
              : 'Gerencie suas escalas e disponibilidade'}
          </p>
          {isLeader && (
            <Badge variant="outline" className="mt-2 gap-1">
              <Shield className="h-3 w-3" />
              Acesso de Líder
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue={isVolunteer ? "invites" : "availability"} className="w-full">
          <TabsList className="w-full mb-6">
            {isVolunteer && (
              <TabsTrigger value="invites" className="flex-1 gap-2">
                <CalendarCheck className="h-4 w-4" />
                Convites
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="availability" className="flex-1 gap-2">
              <CalendarX2 className="h-4 w-4" />
              Disponibilidade
            </TabsTrigger>
          </TabsList>

          {/* Invites Tab */}
          <TabsContent value="invites" className="space-y-6 mt-0">
            {/* Upcoming Invites */}
            <section>
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Próximos Cultos ({upcomingInvites.length})
              </h2>

              {upcomingInvites.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      Você não tem convites pendentes no momento.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {upcomingInvites.map((invite) => {
                    const status = statusConfig[invite.status];
                    const StatusIcon = status.icon;
                    const serviceDate = new Date(invite.service.date);
                    const isPending = invite.status === 'pending';
                    const isTodayService = isToday(serviceDate);

                    return (
                      <Card 
                        key={invite.id} 
                        className={cn(
                          'transition-all duration-200 overflow-hidden',
                          isPending && 'ring-2 ring-amber-500/50 shadow-lg',
                          isTodayService && 'ring-2 ring-primary shadow-lg'
                        )}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {isTodayService && (
                                  <Badge className="bg-primary text-primary-foreground">
                                    🎯 Hoje
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-lg">
                                {invite.service.title}
                              </CardTitle>
                              <CardDescription className="flex flex-wrap items-center gap-3 mt-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {format(serviceDate, "EEE, d 'de' MMM", { locale: ptBR })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {invite.service.time}
                                </span>
                              </CardDescription>
                            </div>
                            <Badge className={cn('shrink-0', status.className)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          {isPending ? (
                            <div className="flex gap-3">
                              <Button
                                size="lg"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                                onClick={() => handleConfirm(invite.id)}
                                disabled={updateStatus.isPending}
                              >
                                {updateStatus.isPending ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-5 w-5" />
                                )}
                                Confirmar
                              </Button>
                              <Button
                                size="lg"
                                variant="outline"
                                className="flex-1 border-red-500/50 text-red-600 hover:bg-red-50 hover:text-red-700 gap-2"
                                onClick={() => handleDeclineClick(invite.id)}
                                disabled={updateStatus.isPending}
                              >
                                <XCircle className="h-5 w-5" />
                                Recusar
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              className="w-full gap-2"
                              onClick={() => navigate(`/services/${invite.service.id}`)}
                            >
                              <Music className="h-4 w-4" />
                              Ver Setlist
                              <ExternalLink className="h-4 w-4 ml-auto" />
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Past Invites */}
            {pastInvites.length > 0 && (
              <section>
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-5 w-5" />
                  Histórico ({pastInvites.length})
                </h2>

                <div className="space-y-2">
                  {pastInvites.slice(0, 5).map((invite) => {
                    const status = statusConfig[invite.status];
                    const serviceDate = new Date(invite.service.date);

                    return (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium text-sm">{invite.service.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(serviceDate, "d 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="availability" className="mt-0">
            <AvailabilityCalendar />
          </TabsContent>
        </Tabs>
      </div>

      {/* Decline Dialog */}
      <Dialog open={declineDialog.open} onOpenChange={(open) => setDeclineDialog({ open, inviteId: open ? declineDialog.inviteId : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Recusar Convite
            </DialogTitle>
            <DialogDescription>
              Você pode informar um motivo para ajudar o líder a entender sua indisponibilidade.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Motivo (opcional): Ex: Viagem, compromisso familiar..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="min-h-[100px]"
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeclineDialog({ open: false, inviteId: null })}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineConfirm}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
