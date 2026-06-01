import { Users, Flame, Music } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

const features = [
  {
    icon: Users,
    title: 'Escala por habilidade',
    description: 'Cada membro tem suas funções cadastradas. Você escala quem realmente pode tocar na função certa, sem adivinhar.',
  },
  {
    icon: Flame,
    title: 'Controle de fadiga',
    description: 'O Cantivo avisa quando alguém está sendo escalado demais. Sua equipe descansa, seu culto não sofre.',
  },
  {
    icon: Music,
    title: 'Setlist no app',
    description: 'Monte o repertório do culto com drag-and-drop. Cada músico vê as músicas antes de chegar.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-violet-50">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que sua equipe precisa em um lugar só.
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Feito para quem está no palco e para quem escala. Simples para os dois lados.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <GlassCard key={feature.title} className="p-6 flex flex-col gap-4">
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
    </section>
  );
}
