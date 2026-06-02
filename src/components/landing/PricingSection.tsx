import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';

const plans = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    members: 'até 8 membros',
    cultos: '4 cultos/mês',
    features: ['Escala por habilidades', 'Indisponibilidade', 'Biblioteca de músicas', 'Cálculo de fadiga'],
    highlight: false,
    cta: 'Começar grátis',
  },
  {
    id: 'essencial',
    name: 'Essencial',
    price: 47,
    members: 'até 20 membros',
    cultos: 'Cultos ilimitados',
    features: ['Tudo do Gratuito', 'Até 20 membros na equipe', 'Suporte por e-mail'],
    highlight: false,
    cta: 'Assinar Essencial',
  },
  {
    id: 'ministerio',
    name: 'Ministério',
    price: 87,
    members: 'até 50 membros',
    cultos: 'Cultos ilimitados',
    features: ['Tudo do Essencial', 'Até 50 membros na equipe', 'Múltiplos times'],
    highlight: true,
    cta: 'Assinar Ministério',
  },
  {
    id: 'igreja',
    name: 'Igreja',
    price: 157,
    members: 'Membros ilimitados',
    cultos: 'Cultos ilimitados',
    features: ['Tudo do Ministério', 'Membros ilimitados', 'Suporte prioritário'],
    highlight: false,
    cta: 'Assinar Igreja',
  },
];

export function PricingSection() {
  return (
    <section className="relative py-24 bg-white overflow-hidden">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16 reveal">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simples e justo para qualquer tamanho de equipe.
          </h2>
          <p className="text-muted-foreground text-lg">
            Comece grátis. Faça upgrade quando sua equipe crescer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan, i) => (
            <GlassCard
              key={plan.id}
              className={cn(
                `reveal reveal-delay-${Math.min(i + 1, 4)} p-6 flex flex-col gap-4 relative`,
                plan.highlight && 'ring-2 ring-primary'
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Mais popular
                </span>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {plan.price === 0 ? 'Grátis' : `R$${plan.price}`}
                  {plan.price > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{plan.members}</p>
                <p className="text-xs text-muted-foreground">{plan.cultos}</p>
              </div>
              <ul className="flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full rounded-full" asChild>
                <Link to="/auth?tab=signup">{plan.cta}</Link>
              </Button>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Gradient fade to CTA dark */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-white to-[#1e1458] pointer-events-none" />
    </section>
  );
}
