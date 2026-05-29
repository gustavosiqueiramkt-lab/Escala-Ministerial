import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'members' | 'cultos';
}

const MESSAGES = {
  members: {
    title: 'Limite de membros atingido',
    description: 'Seu plano atual não permite adicionar mais membros à equipe. Faça upgrade para continuar crescendo.',
  },
  cultos: {
    title: 'Limite de cultos atingido',
    description: 'Você atingiu o limite de cultos do mês no plano gratuito. Faça upgrade para criar cultos sem limite.',
  },
};

export function UpgradePrompt({ open, onOpenChange, reason }: UpgradePromptProps) {
  const navigate = useNavigate();
  const message = MESSAGES[reason];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>{message.title}</DialogTitle>
          </div>
          <DialogDescription>{message.description}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-4">
          <Button
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              navigate('/pricing');
            }}
          >
            Ver planos
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
