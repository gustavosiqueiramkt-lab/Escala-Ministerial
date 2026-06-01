import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#1e1458]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e1458] via-[#2d1fa3] to-[#4F46E5] opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1e1458]/80 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-400/15 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-white/80 text-xs font-medium">Para igrejas de todos os tamanhos</span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            A escala que sua equipe vai amar usar.
          </h1>

          <p className="text-white/70 text-lg leading-relaxed max-w-lg">
            Chega de grupo no WhatsApp e planilha de Excel. Com o Cantivo, o líder escala em minutos e cada músico sabe exatamente quando toca.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              asChild
              className="rounded-full bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-base px-8 shadow-lg shadow-amber-500/30"
            >
              <Link to="/auth?tab=signup">
                Começar grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              asChild
              className="rounded-full text-white border border-white/30 hover:bg-white/10 font-medium text-base px-8"
            >
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>

          <p className="text-white/40 text-sm">
            Grátis para até 8 membros. Sem cartão de crédito.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="relative">
            <div
              className="relative w-64 md:w-72 bg-gray-900 rounded-[3rem] p-3 shadow-2xl shadow-violet-900/50 ring-1 ring-white/10"
              style={{ transform: 'perspective(1000px) rotateY(-8deg) rotateX(3deg)' }}
            >
              <div className="bg-gray-800 rounded-[2.5rem] overflow-hidden aspect-[9/19]">
                <img
                  src="/app-mockup.png"
                  alt="Cantivo app"
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="w-full h-full bg-gradient-to-b from-violet-900 to-indigo-950 flex items-center justify-center">
                  <p className="text-white/40 text-xs text-center px-4">
                    Adicione /public/app-mockup.png
                  </p>
                </div>
              </div>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-gray-900 rounded-full" />
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-8 bg-violet-900/40 blur-xl rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
