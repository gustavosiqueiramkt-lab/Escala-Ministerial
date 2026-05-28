import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CalendarView } from '@/components/ui/calendar-view';
import { useServices, Service } from '@/hooks/useServices';
import { useSongs } from '@/hooks/useSongs';
import { useOrganizationMembersWithSkills, useMemberServiceCounts } from '@/hooks/useMemberSkills';
import { useOrgRole } from '@/hooks/useOrgRole';
import { Music, Users, Calendar, AlertTriangle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

function StatCard({ icon: Icon, label, value, variant = 'default', loading }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  variant?: 'default' | 'warning';
  loading?: boolean;
}) {
  return (
    <div className="card-elevated p-4 lg:p-6 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl lg:text-3xl font-display font-semibold mt-1">{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${variant === 'warning' ? 'bg-warning/10' : 'bg-primary/10'}`}>
          <Icon className={`h-5 w-5 ${variant === 'warning' ? 'text-warning' : 'text-primary'}`} />
        </div>
      </div>
    </div>
  );
}

function UpcomingService({ service }: { service: Service }) {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/services`)}
      className="card-interactive p-4 cursor-pointer animate-slide-up"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">{service.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${
          service.status === 'published' 
            ? 'status-available' 
            : 'status-warning'
        }`}>
          {service.status === 'published' ? 'Publicado' : 'Rascunho'}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {new Date(service.date).toLocaleDateString('pt-BR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        })} às {service.time}
      </p>
      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Music className="h-4 w-4" />
          {service.items?.filter(i => i.type === 'song').length || 0} músicas
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {service.volunteers?.length || 0} membros
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { data: songs = [], isLoading: songsLoading } = useSongs();
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembersWithSkills();
  const { data: serviceCounts = {} } = useMemberServiceCounts(30);
  const { isLeader, isLoading: roleLoading } = useOrgRole();

  // Redirect members (non-leaders) to My Schedule
  useEffect(() => {
    if (!roleLoading && !isLeader) {
      navigate('/my-schedule', { replace: true });
    }
  }, [isLeader, roleLoading, navigate]);
  
  const upcomingServices = services
    .filter(s => new Date(s.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Calculate members with fatigue (3+ services in last 30 days)
  const membersWithFatigue = members.filter(m => 
    m.skills?.completed_at && (serviceCounts[m.id] || 0) >= 3
  );

  const handleServiceClick = (service: Service) => {
    navigate(`/services/${service.id}`);
  };

  const handleDateClick = (date: Date) => {
    if (!isLeader) return;
    navigate(`/services/new?date=${format(date, 'yyyy-MM-dd')}`);
  };

  const isLoading = servicesLoading || songsLoading || membersLoading || roleLoading;

  return (
    <AppLayout title="Dashboard">
      {/* Leader Quick Actions */}
      {isLeader && (
        <div className="flex gap-3 mb-6">
          <Button 
            onClick={() => navigate('/services/new')}
            className="btn-primary-gradient"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Culto
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/team')}
          >
            <Users className="h-4 w-4 mr-2" />
            Gestão de Equipe
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label="Próximos cultos" value={upcomingServices.length} loading={servicesLoading} />
        <StatCard icon={Music} label="Músicas" value={songs.length} loading={songsLoading} />
        <StatCard icon={Users} label="Membros" value={members.filter(m => m.skills?.completed_at).length} loading={membersLoading} />
        <StatCard 
          icon={AlertTriangle} 
          label="Alertas de fadiga" 
          value={membersWithFatigue.length}
          variant="warning"
          loading={membersLoading}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <CalendarView 
            services={services} 
            onServiceClick={handleServiceClick}
            onDateClick={handleDateClick}
          />
        </div>

        {/* Upcoming Services */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Próximos Cultos</h2>
          {servicesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : upcomingServices.length > 0 ? (
            upcomingServices.map((service, index) => (
              <div key={service.id} style={{ animationDelay: `${index * 100}ms` }}>
                <UpcomingService service={service} />
              </div>
            ))
          ) : (
            <div className="card-elevated p-6 text-center text-muted-foreground">
              Nenhum culto agendado
            </div>
          )}

          {/* Alerts */}
          {membersWithFatigue.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display text-xl font-semibold mb-4">Alertas de Fadiga</h2>
              <div className="space-y-2">
                {membersWithFatigue.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg status-warning border animate-slide-up"
                  >
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium">{member.profile?.name || 'Membro'}</span>
                      <span className="text-muted-foreground">
                        {' '}escalado {serviceCounts[member.id]} vezes nos últimos 30 dias
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
