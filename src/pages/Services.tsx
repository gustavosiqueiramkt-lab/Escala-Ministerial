import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { CalendarView } from '@/components/ui/calendar-view';
import { useServices, useDeleteService, Service } from '@/hooks/useServices';
import { useSongs } from '@/hooks/useSongs';
import { useOrganizationMembersWithSkills } from '@/hooks/useMemberSkills';
import { useOrgRole } from '@/hooks/useOrgRole';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Calendar, Music, Users, Clock, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

function ServiceDetail({ 
  service, 
  onClose,
  onEdit,
  onDelete,
  isDeleting
}: { 
  service: Service;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { data: songs = [] } = useSongs();
  const { data: members = [] } = useOrganizationMembersWithSkills();

  const serviceSongs = (service.items || [])
    .filter((i) => i.type === 'song')
    .map((i) => songs.find((s) => s.id === i.song_id))
    .filter(Boolean);

  const serviceMembers = (service.volunteers || [])
    .map((sv) => members.find((m) => m.id === sv.member_id))
    .filter(Boolean);

  const sortedItems = [...(service.items || [])].sort((a, b) => a.item_order - b.item_order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            service.status === 'published' 
              ? 'status-available' 
              : 'status-warning'
          }`}>
            {service.status === 'published' ? 'Publicado' : 'Rascunho'}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDelete} 
            className="text-destructive hover:text-destructive"
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Date and Time */}
      <div className="flex items-center gap-4 text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="capitalize">
            {format(new Date(service.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{service.time}</span>
        </div>
      </div>

      {/* Songs */}
      <div>
        <h3 className="font-medium flex items-center gap-2 mb-3">
          <Music className="h-4 w-4 text-primary" />
          Liturgia ({sortedItems.length} itens)
        </h3>
        <div className="space-y-2">
          {sortedItems.map((item, index) => {
            if (item.type === 'song') {
              const song = songs.find((s) => s.id === item.song_id);
              return (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                  <span className="text-xs text-muted-foreground w-5">{index + 1}</span>
                  <Music className="h-4 w-4 text-primary" />
                  <span className="flex-1">{song?.title || 'Música não encontrada'}</span>
                  <span className="text-sm text-muted-foreground">{song?.key}</span>
                </div>
              );
            }
            return (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/10">
                <span className="text-xs text-muted-foreground w-5">{index + 1}</span>
                <Clock className="h-4 w-4 text-accent" />
                <span className="flex-1">{item.moment_title}</span>
              </div>
            );
          })}
          {sortedItems.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum item adicionado</p>
          )}
        </div>
      </div>

      {/* Members */}
      <div>
        <h3 className="font-medium flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          Equipe ({serviceMembers.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {serviceMembers.map((member) => {
            const sv = (service.volunteers || []).find(v => v.member_id === member!.id);
            const status = sv?.status || 'pending';
            const statusStyles = {
              pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
              confirmed: 'bg-green-500/10 text-green-600 border-green-500/30',
              declined: 'bg-red-500/10 text-red-600 border-red-500/30',
            };
            const statusLabels = {
              pending: 'Pendente',
              confirmed: 'Confirmado',
              declined: 'Recusou',
            };
            
            return (
              <div
                key={member!.id}
                className={`px-3 py-2 rounded-lg border text-sm ${statusStyles[status]}`}
              >
                <span className="font-medium">{member!.profile?.name || 'Membro'}</span>
                {member!.skills?.instrument && (
                  <span className="text-muted-foreground ml-1">
                    ({member!.skills.instrument})
                  </span>
                )}
                <span className="ml-2 text-xs opacity-75">
                  • {statusLabels[status]}
                </span>
              </div>
            );
          })}
          {serviceMembers.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum membro escalado</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Services() {
  const navigate = useNavigate();
  const { data: services = [], isLoading } = useServices();
  const { isLeader } = useOrgRole();
  const deleteService = useDeleteService();
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const handleServiceClick = (service: Service) => {
    // Navigate to detail page instead of opening modal
    navigate(`/services/${service.id}`);
  };

  const handleDateClick = (date: Date) => {
    if (!isLeader) return;
    navigate(`/services/new?date=${format(date, 'yyyy-MM-dd')}`);
  };

  const handleServiceModalClick = (service: Service, e?: React.MouseEvent) => {
    // Used for quick preview from calendar
    if (e) {
      e.stopPropagation();
    }
    setSelectedService(service);
  };

  const handleEdit = () => {
    if (selectedService) {
      navigate(`/services/${selectedService.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (selectedService) {
      await deleteService.mutateAsync(selectedService.id);
      setSelectedService(null);
    }
  };

  return (
    <AppLayout title="Cultos">
      {/* Header - only show create button for leaders */}
      {isLeader && (
        <div className="flex justify-end mb-6">
          <Button 
            onClick={() => navigate('/services/new')}
            className="btn-primary-gradient"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Culto
          </Button>
        </div>
      )}

      {/* Calendar */}
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <CalendarView 
          services={services}
          onServiceClick={handleServiceClick}
          onDateClick={handleDateClick}
        />
      )}

      {/* Service Detail Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {selectedService?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedService && (
            <ServiceDetail 
              service={selectedService}
              onClose={() => setSelectedService(null)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deleteService.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
