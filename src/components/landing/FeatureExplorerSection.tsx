import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, Music, Users, CalendarCheck } from 'lucide-react';

const features = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    label: 'Visão geral',
    title: 'Tudo que acontece na sua equipe em uma tela só.',
    description: 'Veja quantos cultos estão agendados, quantas músicas estão no repertório, quantos membros estão na equipe e se algum está em risco de fadiga. O dashboard é o ponto de partida do líder.',
    screenshot: '/screenshots/dashboard.png',
  },
  {
    id: 'services',
    icon: Calendar,
    label: 'Cultos',
    title: 'Organize cada culto com precisão.',
    description: 'Crie cultos, defina o setlist com drag-and-drop, escale cada membro por habilidade e acompanhe confirmações em tempo real. Nada escapa.',
    screenshot: '/screenshots/services.png',
  },
  {
    id: 'songs',
    icon: Music,
    label: 'Músicas',
    title: 'Sua biblioteca de músicas sempre atualizada.',
    description: 'Cadastre músicas com título, tom, link do YouTube e PDF de cifra. Na hora de montar o setlist, tudo está a um clique. Sem planilha separada, sem arquivo solto no grupo.',
    screenshot: '/screenshots/song-library.png',
  },
  {
    id: 'team',
    icon: Users,
    label: 'Equipe',
    title: 'Gerencie quem faz parte da sua equipe.',
    description: 'Convide membros por e-mail, defina funções e permissões. Cada pessoa vê exatamente o que precisa ver: o líder gerencia, o músico vê sua escala.',
    screenshot: '/screenshots/team.png',
  },
  {
    id: 'schedule',
    icon: CalendarCheck,
    label: 'Minha Agenda',
    title: 'O músico sabe quando toca sem precisar perguntar.',
    description: 'Cada voluntário tem sua própria visão da escala e um calendário para marcar os dias em que não pode. O líder já vê a disponibilidade na hora de escalar.',
    screenshot: '/screenshots/my-schedule.png',
  },
];

export function FeatureExplorerSection() {
  const [active, setActive] = useState('dashboard');
  const current = features.find(f => f.id === active)!;

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16 reveal">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Veja o Cantivo por dentro.
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Clique em cada funcionalidade para ver como ela funciona no app.
          </p>
        </div>

        <div className="grid lg:grid-cols-[280px,1fr] gap-8 items-start reveal" style={{ transitionDelay: '0.08s' }}>
          {/* Tab list */}
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setActive(feature.id)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 whitespace-nowrap lg:whitespace-normal w-full flex-shrink-0',
                  active === feature.id
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <feature.icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">{feature.label}</span>
              </button>
            ))}
          </div>

          {/* Screenshot + description */}
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                {current.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {current.description}
              </p>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-border shadow-lg shadow-violet-900/5">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
                </div>
                <div className="flex-1 mx-2">
                  <div className="bg-background rounded px-3 py-0.5 text-muted-foreground/50 text-xs text-center border border-border/50">
                    cantivo.app.br
                  </div>
                </div>
              </div>
              <img
                key={current.id}
                src={current.screenshot}
                alt={current.label}
                className="w-full object-cover object-top"
                style={{ maxHeight: '420px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
