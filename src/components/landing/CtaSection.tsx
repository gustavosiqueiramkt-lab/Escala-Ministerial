import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-[#1e1458] via-[#2d1fa3] to-[#4F46E5] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-[#1e1458]/60 to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-400/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center flex flex-col items-center gap-6">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight">
          Sua equipe vai agradecer.
        </h2>
        <p className="text-white/70 text-lg max-w-md">
          Comece grátis com até 8 membros. Sem cartão de crédito.
        </p>
        <Button
          size="lg"
          asChild
          className="rounded-full bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-base px-10 shadow-lg shadow-amber-500/30"
        >
          <Link to="/auth?tab=signup">
            Criar minha conta grátis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
