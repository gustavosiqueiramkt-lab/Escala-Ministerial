import { Users, Flame, Music } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

const features = [
  {
    icon: Users,
    title: 'Escala por habilidade',
    description: 'Cada membro tem suas funções cadastradas. Você escala quem realmente pode tocar na função certa, sem precisar adivinhar.',
  },
  {
    icon: Flame,
    title: 'Controle de fadiga',
    description: 'O Cantivo avisa quando alguém está sendo escalado demais. Sua equipe descansa e o culto não sofre.',
  },
  {
    icon: Music,
    title: 'Setlist integrado',
    description: 'Monte o repertório do culto com drag-and-drop. Cada músico vê as músicas antes de chegar.',
  },
];

export function FeaturesSection() {
  return (
    <section className="relative py-16 pt-8 bg-[#f5f3ff] overflow-hidden">
      {/* Gradient fade from white (top) */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white to-[#f5f3ff] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="text-center mb-16 reveal">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Escala, setlist e equipe no mesmo lugar.
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Tudo que o líder precisa para organizar o culto e tudo que o músico precisa para saber quando toca.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <GlassCard key={feature.title} className="reveal p-6 flex flex-col gap-4" style={{ transitionDelay: `${(i + 1) * 0.08}s` }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Gradient fade to white (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-[#f5f3ff] to-white pointer-events-none" />
    </section>
  );
}
