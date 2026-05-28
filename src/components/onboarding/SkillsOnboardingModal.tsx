import { useState } from 'react';
import { useUpdateMySkills, roleLabels, VolunteerRole } from '@/hooks/useMemberSkills';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mic, Music, Settings, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillsOnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const roleOptions: { value: VolunteerRole; label: string; icon: typeof Mic; description: string }[] = [
  { value: 'vocalist', label: 'Vocal', icon: Mic, description: 'Canto, backing vocal, ministração' },
  { value: 'instrumentalist', label: 'Instrumentista', icon: Music, description: 'Violão, teclado, bateria, baixo...' },
  { value: 'technician', label: 'Técnico', icon: Settings, description: 'Som, projeção, transmissão' },
];

const suggestedSkills: Record<VolunteerRole, string[]> = {
  vocalist: ['Soprano', 'Contralto', 'Tenor', 'Baixo', 'Ministração', 'Backing Vocal'],
  instrumentalist: ['Violão', 'Guitarra', 'Baixo', 'Teclado', 'Piano', 'Bateria', 'Percussão', 'Violino', 'Flauta', 'Saxofone'],
  technician: ['Mesa de Som', 'Projeção', 'Transmissão', 'Iluminação', 'Gravação', 'Edição'],
};

export function SkillsOnboardingModal({ open, onComplete }: SkillsOnboardingModalProps) {
  const updateSkills = useUpdateMySkills();
  const [role, setRole] = useState<VolunteerRole>('vocalist');
  const [instrument, setInstrument] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  const handleToggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills(prev => [...prev, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  };

  const handleSubmit = async () => {
    await updateSkills.mutateAsync({
      volunteer_role: role,
      instrument: role === 'instrumentalist' ? instrument : null,
      skills: selectedSkills,
    });
    onComplete();
  };

  const isValid = selectedSkills.length > 0 && (role !== 'instrumentalist' || instrument.trim());

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="font-display text-2xl">Bem-vindo à equipe! 🎉</DialogTitle>
          <DialogDescription className="text-base">
            Antes de começar, conte-nos um pouco sobre suas habilidades para podermos te escalar corretamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Qual é sua principal função?</Label>
            <div className="grid gap-2">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = role === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setRole(option.value);
                      setSelectedSkills([]);
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instrument (for instrumentalists) */}
          {role === 'instrumentalist' && (
            <div className="space-y-2 animate-slide-up">
              <Label htmlFor="instrument">Qual seu instrumento principal?</Label>
              <Input
                id="instrument"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                placeholder="Ex: Violão, Teclado, Bateria..."
              />
            </div>
          )}

          {/* Skills Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Selecione suas habilidades</Label>
            
            {/* Suggested Skills */}
            <div className="flex flex-wrap gap-2">
              {suggestedSkills[role].map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleToggleSkill(skill)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-secondary-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>

            {/* Custom Skill Input */}
            <div className="flex gap-2">
              <Input
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                placeholder="Adicionar outra habilidade..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddCustomSkill}
                disabled={!customSkill.trim()}
              >
                Adicionar
              </Button>
            </div>

            {/* Selected Skills Display */}
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedSkills.map((skill) => (
                  <Badge key={skill} variant="default" className="gap-1 pr-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-1 rounded-full p-0.5 hover:bg-primary-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || updateSkills.isPending}
          className="w-full btn-primary-gradient"
          size="lg"
        >
          {updateSkills.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Começar a Servir
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
