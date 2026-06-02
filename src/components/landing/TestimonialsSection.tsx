import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Quote } from 'lucide-react';

export function TestimonialsSection() {
  return (
    <section className="relative py-16 pt-8 bg-[#f5f3ff] overflow-hidden">
      {/* Gradient fade from white (top) */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white to-[#f5f3ff] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="text-center mb-16 reveal">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            As primeiras igrejas estão chegando.
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            O Cantivo está em fase de lançamento. Seja uma das primeiras equipes a usar e ajude a moldar o produto.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`reveal reveal-delay-${i + 1} flex flex-col gap-4 p-6 rounded-2xl border-2 border-dashed border-violet-200 bg-white/60`}
            >
              <Quote className="h-6 w-6 text-violet-300" />
              <div className="flex-1">
                <p className="text-muted-foreground/50 text-sm italic leading-relaxed">
                  Em breve: depoimento de quem usou o Cantivo pela primeira vez.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-violet-100">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                  <span className="text-violet-400 text-xs font-bold">?</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground/50">Sua Igreja</p>
                  <p className="text-xs text-muted-foreground/40">Líder de louvor</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center reveal">
          <Button asChild className="rounded-full px-8">
            <Link to="/auth?tab=signup">
              Quero ser uma das primeiras igrejas
            </Link>
          </Button>
          <p className="text-muted-foreground/60 text-xs mt-3">
            Grátis para até 8 membros. Sem cartão de crédito.
          </p>
        </div>
      </div>

      {/* Gradient fade to white (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-[#f5f3ff] to-white pointer-events-none" />
    </section>
  );
}
