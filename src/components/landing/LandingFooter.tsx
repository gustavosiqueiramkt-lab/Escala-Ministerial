import { Link } from 'react-router-dom';
import { CantivoMark } from '@/components/brand/CantivoMark';

export function LandingFooter() {
  return (
    <footer className="bg-[#1e1458] border-t border-white/10 py-8">
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20">
            <CantivoMark size={14} color="white" />
          </div>
          <span className="font-display font-bold text-white text-sm">Cantivo</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/auth" className="text-white/50 hover:text-white/80 text-sm transition-colors">
            Entrar
          </Link>
          <Link to="/auth?tab=signup" className="text-white/50 hover:text-white/80 text-sm transition-colors">
            Criar conta
          </Link>
        </div>

        <p className="text-white/30 text-xs">© 2026 Cantivo</p>
      </div>
    </footer>
  );
}
