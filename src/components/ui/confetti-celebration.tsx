import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfettiCelebrationProps {
  show: boolean;
  onComplete?: () => void;
}

export function ConfettiCelebration({ show, onComplete }: ConfettiCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);

      // Fire confetti
      const duration = 2000;
      const end = Date.now() + duration;

      const colors = ['#22c55e', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      // Initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors,
      });

      frame();

      // Hide after animation
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="animate-scale-in flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-green-400/30" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-green-500 shadow-2xl shadow-green-500/50">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
        </div>
        <div className="text-center animate-fade-in">
          <p className="text-2xl font-bold text-green-600">Confirmado!</p>
          <p className="text-muted-foreground">Obrigado pela confirmação 🎉</p>
        </div>
      </div>
    </div>
  );
}
