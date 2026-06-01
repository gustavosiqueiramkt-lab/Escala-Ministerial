import { MessageSquare, FileSpreadsheet, AlertTriangle } from 'lucide-react';

const problems = [
  {
    icon: MessageSquare,
    title: 'WhatsApp lotado',
    description: 'Quem confirma a escala no grupo acaba se perdendo entre memes e avisos que ninguém lê.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Planilha desatualizada',
    description: 'Todo domingo alguém edita a planilha errado e a escala fica bagunçada na hora H.',
  },
  {
    icon: AlertTriangle,
    title: 'Falta de última hora',
    description: 'Ninguém avisou que não podia tocar e você só descobre quando já está no palco.',
  },
];

export function ProblemSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Você conhece essa situação?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Todo líder de louvor já passou por isso. O problema não é falta de dedicação, é não ter a ferramenta certa.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="flex flex-col gap-4 p-6 rounded-2xl border border-border bg-background hover:border-primary/20 hover:shadow-md transition-all duration-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                <problem.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-1">{problem.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{problem.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
