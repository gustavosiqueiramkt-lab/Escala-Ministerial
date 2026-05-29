import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';
import { usePlan } from '@/hooks/usePlan';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

const plans = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    members: 'até 8 membros',
    cultos: '4 cultos/mês',
    features: [
      'Escala por habilidades',
      'Indisponibilidade',
      'Biblioteca de músicas',
      'Cálculo de fadiga',
    ],
    highlight: false,
  },
  {
    id: 'essencial',
    name: 'Essencial',
    price: 47,
    members: 'até 20 membros',
    cultos: 'Cultos ilimitados',
    features: [
      'Tudo do Gratuito',
      'Até 20 membros na equipe',
      'Suporte por e-mail',
    ],
    highlight: false,
  },
  {
    id: 'ministerio',
    name: 'Ministério',
    price: 87,
    members: 'até 50 membros',
    cultos: 'Cultos ilimitados',
    features: [
      'Tudo do Essencial',
      'Até 50 membros na equipe',
      'Múltiplos times',
    ],
    highlight: true,
  },
  {
    id: 'igreja',
    name: 'Igreja',
    price: 157,
    members: 'Membros ilimitados',
    cultos: 'Cultos ilimitados',
    features: [
      'Tudo do Ministério',
      'Membros ilimitados',
      'Suporte prioritário',
    ],
    highlight: false,
  },
];

export default function Pricing() {
  const { planId } = usePlan();
  const { organization } = useOrganization();

  const handleSubscribe = async (selectedPlanId: string) => {
    if (selectedPlanId === 'free') return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planId: selectedPlanId, organizationId: organization?.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error('Erro ao iniciar checkout. Tente novamente.');
    }
  };

  return (
    <AppLayout title="Planos">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Escolha o plano certo para sua equipe
          </h2>
          <p className="text-muted-foreground">
            Todos os planos incluem 14 dias grátis. Cancele quando quiser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <GlassCard
              key={plan.id}
              className={cn(
                'p-6 flex flex-col gap-4 relative',
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
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.id === planId ? 'outline' : 'default'}
                disabled={plan.id === planId}
                onClick={() => handleSubscribe(plan.id)}
              >
                {plan.id === planId ? 'Plano atual' : plan.price === 0 ? 'Usar grátis' : `Assinar ${plan.name}`}
              </Button>
            </GlassCard>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
