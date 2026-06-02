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
import { useAuth } from '@/hooks/useAuth';

function getGreeting(): string {
  const hours = new Date().getHours();
  if (hours < 12) return 'Bom dia';
  if (hours < 18) return 'Boa tarde';
  return 'Boa noite';
}

function HeroBanner({
  firstName,
  nextService,
  onNewService,
  onTeam,
}: {
  firstName: string;
  nextService: Service | null;
  onNewService: () => void;
  onTeam: () => void;
}) {
  const greeting = getGreeting();
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const nextDate = nextService
    ? new Date(nextService.date).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 p-6 lg:p-8 animate-slide-up">
      {/* Decoração de brilho sutil no canto superior direito */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 85% 15%, #ffffff 0%, transparent 55%)',
        }}
      />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Esquerda: saudação + subtítulo + botões */}
        <div className="flex-1">
          <p className="text-violet-200 text-xs font-semibold tracking-widest uppercase mb-2">
            Equipe de Louvor
          </p>
          <h1 className="text-white text-3xl lg:text-4xl font-display font-bold mb-2 leading-tight">
            {greeting}, {firstName}!
          </h1>
          <p className="text-violet-200 text-sm mb-6">
            Sua equipe está pronta para louvar.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={onNewService}
              className="bg-white text-violet-700 hover:bg-violet-50 font-semibold shadow-lg border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Culto
            </Button>
            <Button
              onClick={onTeam}
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 bg-transparent backdrop-blur-sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Equipe
            </Button>
          </div>
        </div>

        {/* Direita: glass card com data + próximo culto */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4 lg:p-5 min-w-[200px] shrink-0">
          <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest">
            Hoje
          </p>
          <p className="text-white font-semibold mt-1 capitalize text-sm">{hoje}</p>

          <div className="border-t border-white/20 my-3" />

          <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest">
            Próximo Culto
          </p>
          {nextService ? (
            <>
              <p className="text-white font-semibold mt-1 text-sm leading-snug">
                {nextService.title}
              </p>
              <p className="text-violet-200 text-xs mt-0.5 capitalize">
                {nextDate} · {nextService.time}
              </p>
            </>
          ) : (
            <p className="text-violet-300 text-sm mt-1">Nenhum agendado</p>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const { user } = useAuth();
  const firstName = (user?.user_metadata?.full_name as string | undefined)
    ?.split(' ')[0] ?? 'Líder';

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
      {isLeader && (
        <HeroBanner
          firstName={firstName}
          nextService={upcomingServices[0] ?? null}
          onNewService={() => navigate('/services/new')}
          onTeam={() => navigate('/team')}
        />
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
