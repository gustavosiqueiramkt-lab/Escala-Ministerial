import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#0f0a2e]">
      {/* Mesh gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0a2e] via-[#1e1458] to-[#2d1fa3]" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-violet-600/10 to-indigo-400/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(263_80%_65%/0.2)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_hsl(243_89%_40%/0.3)_0%,_transparent_60%)]" />

      {/* Blur orbs */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/6 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px]" />
      <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        {/* Text */}
        <div className="flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 bg-white/8 backdrop-blur-sm border border-white/15 rounded-full px-4 py-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <span className="text-white/70 text-xs font-medium">Para equipes de louvor de igrejas pequenas e médias</span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            A escala que sua equipe vai amar usar.
          </h1>

          <p className="text-white/65 text-lg leading-relaxed max-w-lg">
            Chega de grupo no WhatsApp e planilha de Excel. Com o Cantivo, o líder escala em minutos e cada músico sabe exatamente quando toca.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              asChild
              className="rounded-full bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-base px-8 shadow-lg shadow-amber-500/25"
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
              className="rounded-full text-white border border-white/25 hover:bg-white/8 font-medium text-base px-8"
            >
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>

          <p className="text-white/35 text-sm">
            Grátis para até 8 membros. Sem cartão de crédito.
          </p>
        </div>

        {/* Browser frame mockup */}
        <div className="flex justify-center lg:justify-end">
          <div
            className="relative w-full max-w-[520px]"
            style={{ transform: 'perspective(1200px) rotateY(-6deg) rotateX(2deg)' }}
          >
            {/* Browser chrome */}
            <div className="bg-[#1a1a2e] rounded-xl overflow-hidden shadow-2xl shadow-violet-950/60 ring-1 ring-white/10">
              {/* Browser top bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#13132a] border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 mx-3">
                  <div className="bg-white/8 rounded-md px-3 py-1 text-white/30 text-xs text-center">
                    cantivo.app.br
                  </div>
                </div>
              </div>
              {/* Screenshot */}
              <div className="aspect-[16/10] overflow-hidden bg-gray-900">
                <img
                  src="/screenshots/dashboard.png"
                  alt="Cantivo dashboard"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>

            {/* Glow under the frame */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-violet-600/30 blur-2xl rounded-full" />
          </div>
        </div>
      </div>

      {/* Wave divider at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
          <path d="M0 80L48 69.3C96 58.7 192 37.3 288 32C384 26.7 480 37.3 576 48C672 58.7 768 69.3 864 69.3C960 69.3 1056 58.7 1152 48C1248 37.3 1344 26.7 1392 21.3L1440 16V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z" fill="white"/>
        </svg>
      </div>
    </section>
  );
}
