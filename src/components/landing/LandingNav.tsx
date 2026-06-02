import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CantivoMark } from '@/components/brand/CantivoMark';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <nav
        className={cn(
          'flex items-center justify-between gap-6 rounded-full px-5 py-2.5 transition-all duration-300',
          'bg-white/80 backdrop-blur-md border border-white/40',
          scrolled ? 'shadow-lg shadow-violet-900/10 w-full max-w-2xl' : 'w-full max-w-xl'
        )}
      >
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <CantivoMark size={17} color="white" />
          </div>
          <span className="font-display font-bold text-foreground text-sm">Cantivo</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="text-sm font-medium">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button size="sm" asChild className="rounded-full text-sm font-semibold px-4">
            <Link to="/auth?tab=signup">Começar grátis</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
