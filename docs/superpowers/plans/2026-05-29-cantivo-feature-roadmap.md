# Cantivo — Feature Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 10 funcionalidades em 3 níveis de complexidade para o Cantivo, cobrindo o fluxo completo do membro, gestão de ensaio, exportação de setlist, relatórios, colaboração e auto-escala inteligente.

**Architecture:** PWA React 18 + Vite + TypeScript com Supabase (Postgres + Auth + RLS). Cada feature tem sua migration SQL, hook React Query, e componentes shadcn/ui. Sem backend intermediário — toda lógica vai em hooks client-side ou funções Postgres.

**Tech Stack:** React 18, TypeScript, Supabase JS v2, React Query v5, Zod, shadcn/ui, Tailwind CSS, DnD Kit, Recharts, React Router v7.

---

## Mapa de Arquivos

### Novos arquivos
```
src/hooks/useMyServices.ts           # escalas do membro logado
src/hooks/useSwapRequests.ts         # troca de escala
src/hooks/useSongSuggestions.ts      # setlist colaborativo
src/hooks/useParticipationReport.ts  # relatório de participação
src/lib/exportSetlist.ts             # formatadores de exportação
src/lib/autoSchedule.ts              # algoritmo de auto-escala
src/components/service/ContextTagSelect.tsx      # tag de contexto
src/components/service/RehearsalSection.tsx      # seção de ensaio
src/components/service/ExportDialog.tsx          # modal de exportação
src/components/service/SwapRequestDialog.tsx     # modal de troca
src/components/service/SongSuggestionsPanel.tsx  # sugestões colaborativas
src/components/service/AutoScheduleDialog.tsx    # modal auto-escala
src/components/songs/SongHistoryDrawer.tsx       # histórico de uso
src/components/songs/YouTubePlayer.tsx           # embed YouTube
src/components/reports/ParticipationReport.tsx   # relatório UI
src/pages/Reports.tsx                            # página de relatórios
```

### Arquivos modificados
```
supabase/migrations/ (5 novas migrations)
src/integrations/supabase/types.ts  # atualizar após cada migration
src/hooks/useServices.ts            # novos campos em Service e ServiceItem
src/hooks/useSongs.ts               # query de histórico + lyrics
src/pages/MySchedule.tsx            # confirmação/recusa + troca
src/pages/ServiceDetail.tsx         # ensaio + export + sugestões + context tags
src/pages/ServiceCreate.tsx         # botão auto-escala
src/pages/SongLibrary.tsx           # last-used + YouTube + histórico
src/App.tsx                         # rota /reports
src/components/layout/Sidebar.tsx   # link Relatórios
```

---

## FEATURE A — Confirmação e Recusa de Escala [Nível 1]

O membro já existe em `service_volunteers` com `status: 'pending'`. A RLS já permite `UPDATE` no próprio status. Só falta o hook e a UI em MySchedule.

### Task A1: Hook useMyServices

**Files:**
- Create: `src/hooks/useMyServices.ts`

- [ ] **Criar o hook com query das escalas pendentes do membro logado**

```typescript
// src/hooks/useMyServices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';

export interface MyServiceItem {
  volunteerId: string;
  status: 'pending' | 'confirmed' | 'declined';
  service: {
    id: string;
    title: string;
    date: string;
    time: string;
    status: string;
  };
}

export function useMyServices() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['my-services', user?.id, currentOrg?.id],
    enabled: !!user?.id && !!currentOrg?.id,
    queryFn: async (): Promise<MyServiceItem[]> => {
      // Busca o organization_member do usuário logado
      const { data: member, error: memberError } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user!.id)
        .eq('organization_id', currentOrg!.id)
        .single();

      if (memberError || !member) return [];

      const { data, error } = await supabase
        .from('service_volunteers')
        .select(`
          id,
          status,
          services (
            id, title, date, time, status
          )
        `)
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? [])
        .filter((row) => row.services)
        .map((row) => ({
          volunteerId: row.id,
          status: row.status as MyServiceItem['status'],
          service: row.services as MyServiceItem['service'],
        }));
    },
  });
}

export function useUpdateVolunteerStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      volunteerId,
      status,
    }: {
      volunteerId: string;
      status: 'confirmed' | 'declined';
    }) => {
      const { error } = await supabase
        .from('service_volunteers')
        .update({ status })
        .eq('id', volunteerId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-services'] });
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
```

- [ ] **Commit**
```bash
git add src/hooks/useMyServices.ts
git commit -m "feat: add useMyServices hook for member schedule confirmation"
```

---

### Task A2: UI de confirmação em MySchedule

**Files:**
- Modify: `src/pages/MySchedule.tsx`

- [ ] **Adicionar seção "Minhas Escalas" acima do calendário de indisponibilidade**

Localizar o JSX principal de `MySchedule.tsx` e adicionar antes do bloco do calendário:

```tsx
// Importações a adicionar no topo de MySchedule.tsx:
import { useMyServices, useUpdateVolunteerStatus } from '@/hooks/useMyServices';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// Dentro do componente, junto aos outros hooks:
const { data: myServices = [], isLoading: servicesLoading } = useMyServices();
const updateStatus = useUpdateVolunteerStatus();

const handleStatusUpdate = async (volunteerId: string, status: 'confirmed' | 'declined') => {
  await updateStatus.mutateAsync({ volunteerId, status });
  toast.success(status === 'confirmed' ? 'Presença confirmada!' : 'Ausência registrada.');
};

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  declined: { label: 'Recusado', color: 'bg-red-100 text-red-800', icon: XCircle },
};
```

Bloco JSX a inserir (antes do componente de calendário existente):

```tsx
<div className="space-y-4 mb-8">
  <h2 className="text-lg font-semibold">Minhas Escalas</h2>
  {servicesLoading ? (
    <p className="text-sm text-muted-foreground">Carregando...</p>
  ) : myServices.length === 0 ? (
    <p className="text-sm text-muted-foreground">Você não tem escalas próximas.</p>
  ) : (
    <div className="space-y-3">
      {myServices.map((item) => {
        const cfg = statusConfig[item.status];
        const Icon = cfg.icon;
        return (
          <div
            key={item.volunteerId}
            className="flex items-center justify-between p-4 border rounded-lg bg-card"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium">{item.service.title}</span>
              <span className="text-sm text-muted-foreground">
                {format(parseISO(item.service.date), "dd 'de' MMMM", { locale: ptBR })}
                {item.service.time ? ` · ${item.service.time.slice(0, 5)}` : ''}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${cfg.color}`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </span>
            </div>
            {item.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusUpdate(item.volunteerId, 'confirmed')}
                  disabled={updateStatus.isPending}
                >
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStatusUpdate(item.volunteerId, 'declined')}
                  disabled={updateStatus.isPending}
                >
                  Recusar
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  )}
</div>
```

- [ ] **Verificar manualmente:** abrir /my-schedule como membro; escala com status pending deve mostrar botões Confirmar/Recusar; clicar Confirmar → badge muda para verde; clicar Recusar → badge vermelho.

- [ ] **Commit**
```bash
git add src/pages/MySchedule.tsx
git commit -m "feat: member can confirm or decline schedule from MySchedule page"
```

---

## FEATURE B — Tags de Contexto no Setlist [Nível 1]

Cada item do setlist pode receber uma tag indicando seu papel no culto (Abertura, Louvor, Oferta, etc.).

### Task B1: Migration — context_tag em service_items

**Files:**
- Create: `supabase/migrations/20260529_000001_add_context_tag_to_service_items.sql`

- [ ] **Criar migration**

```sql
-- supabase/migrations/20260529_000001_add_context_tag_to_service_items.sql
ALTER TABLE service_items
  ADD COLUMN IF NOT EXISTS context_tag TEXT
  CHECK (
    context_tag IS NULL OR context_tag IN (
      'abertura', 'louvor', 'adoracao', 'oferta', 'ceia',
      'palavra', 'encerramento', 'outro'
    )
  );

COMMENT ON COLUMN service_items.context_tag IS
  'Papel do item no culto: abertura, louvor, adoracao, oferta, ceia, palavra, encerramento, outro';
```

- [ ] **Aplicar no Supabase Dashboard (SQL Editor) ou via CLI:**
```bash
supabase db push
```

- [ ] **Commit**
```bash
git add supabase/migrations/20260529_000001_add_context_tag_to_service_items.sql
git commit -m "migration: add context_tag to service_items"
```

---

### Task B2: Atualizar tipos e hook

**Files:**
- Modify: `src/hooks/useServices.ts`

- [ ] **Adicionar `context_tag` ao interface `ServiceItem` no useServices.ts**

Localizar a interface `ServiceItem` e adicionar o campo:
```typescript
interface ServiceItem {
  id: string;
  service_id: string;
  type: 'song' | 'moment';
  song_id: string | null;
  moment_title: string | null;
  item_order: number;
  notes: string | null;
  context_tag: string | null;  // <- adicionar
  created_at: string;
}
```

Localizar a mutation de update de item (ou criar se não existir) e garantir que `context_tag` é incluído no payload de update:
```typescript
// Dentro da mutation de updateServiceItem (ou updateItem):
const { error } = await supabase
  .from('service_items')
  .update({
    notes: data.notes,
    context_tag: data.context_tag ?? null,  // <- adicionar
    moment_title: data.moment_title,
  })
  .eq('id', itemId);
```

- [ ] **Commit**
```bash
git add src/hooks/useServices.ts
git commit -m "feat: include context_tag in ServiceItem type and mutations"
```

---

### Task B3: Componente ContextTagSelect + integração no ServiceDetail

**Files:**
- Create: `src/components/service/ContextTagSelect.tsx`
- Modify: `src/pages/ServiceDetail.tsx`

- [ ] **Criar ContextTagSelect**

```tsx
// src/components/service/ContextTagSelect.tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CONTEXT_TAGS = [
  { value: 'abertura', label: 'Abertura' },
  { value: 'louvor', label: 'Louvor' },
  { value: 'adoracao', label: 'Adoração' },
  { value: 'oferta', label: 'Oferta' },
  { value: 'ceia', label: 'Ceia' },
  { value: 'palavra', label: 'Palavra' },
  { value: 'encerramento', label: 'Encerramento' },
  { value: 'outro', label: 'Outro' },
];

interface ContextTagSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function ContextTagSelect({ value, onChange, disabled }: ContextTagSelectProps) {
  return (
    <Select
      value={value ?? ''}
      onValueChange={(v) => onChange(v === '' ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className="h-7 text-xs w-36">
        <SelectValue placeholder="Contexto..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Sem tag</SelectItem>
        {CONTEXT_TAGS.map((tag) => (
          <SelectItem key={tag.value} value={tag.value}>
            {tag.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Integrar no card de item do setlist em ServiceDetail.tsx**

Localizar o componente/bloco que renderiza cada item do setlist (provavelmente `SetlistCardProps` ou similar). Adicionar o `ContextTagSelect` ao lado das notas, visível apenas para admins/owners:

```tsx
// Dentro do card de item do setlist, após o título da música:
{isLeader && (
  <ContextTagSelect
    value={item.context_tag}
    onChange={(tag) => updateItemContextTag(item.id, tag)}
  />
)}
{!isLeader && item.context_tag && (
  <span className="text-xs text-muted-foreground capitalize">{item.context_tag}</span>
)}
```

Adicionar a função `updateItemContextTag` junto aos outros handlers de mutação em ServiceDetail:
```typescript
const updateItemContextTag = async (itemId: string, contextTag: string | null) => {
  await supabase
    .from('service_items')
    .update({ context_tag: contextTag })
    .eq('id', itemId);
  queryClient.invalidateQueries({ queryKey: ['service', serviceId] });
};
```

- [ ] **Verificar:** abrir um culto como admin; cada item do setlist deve mostrar o select de contexto; salvar Abertura no primeiro item → o select permanece com "Abertura" após reload.

- [ ] **Commit**
```bash
git add src/components/service/ContextTagSelect.tsx src/pages/ServiceDetail.tsx
git commit -m "feat: context tag selector on setlist items"
```

---

## FEATURE C — Histórico de Músicas por Culto [Nível 1]

Mostra quando e em quais cultos uma música foi usada.

### Task C1: Query de histórico em useSongs

**Files:**
- Modify: `src/hooks/useSongs.ts`

- [ ] **Adicionar hook `useSongHistory`**

```typescript
// Adicionar ao final de src/hooks/useSongs.ts

export interface SongHistoryEntry {
  serviceId: string;
  serviceTitle: string;
  serviceDate: string;
  contextTag: string | null;
}

export function useSongHistory(songId: string | null) {
  return useQuery({
    queryKey: ['song-history', songId],
    enabled: !!songId,
    queryFn: async (): Promise<SongHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('service_items')
        .select(`
          context_tag,
          services (
            id, title, date
          )
        `)
        .eq('song_id', songId!)
        .eq('type', 'song')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data ?? [])
        .filter((row) => row.services)
        .map((row) => ({
          serviceId: (row.services as any).id,
          serviceTitle: (row.services as any).title,
          serviceDate: (row.services as any).date,
          contextTag: row.context_tag,
        }));
    },
  });
}

// Adicionar também um helper para "último uso" na listagem de músicas
export function useSongsWithLastUsed(organizationId: string | null) {
  return useQuery({
    queryKey: ['songs-last-used', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      // Busca todas as músicas e a data do último uso em um serviço
      const { data, error } = await supabase
        .from('songs')
        .select(`
          *,
          service_items (
            created_at,
            services ( date )
          )
        `)
        .eq('organization_id', organizationId!)
        .order('title', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((song) => {
        const usages = (song.service_items ?? [])
          .filter((si: any) => si.services?.date)
          .map((si: any) => si.services.date as string)
          .sort()
          .reverse();

        return {
          ...song,
          lastUsedDate: usages[0] ?? null,
          usageCount: usages.length,
        };
      });
    },
  });
}
```

- [ ] **Commit**
```bash
git add src/hooks/useSongs.ts
git commit -m "feat: song history and last-used queries"
```

---

### Task C2: Exibir last-used na SongLibrary + drawer de histórico

**Files:**
- Create: `src/components/songs/SongHistoryDrawer.tsx`
- Modify: `src/pages/SongLibrary.tsx`

- [ ] **Criar SongHistoryDrawer**

```tsx
// src/components/songs/SongHistoryDrawer.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSongHistory } from '@/hooks/useSongs';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History } from 'lucide-react';

interface SongHistoryDrawerProps {
  songId: string | null;
  songTitle: string;
  open: boolean;
  onClose: () => void;
}

export function SongHistoryDrawer({ songId, songTitle, open, onClose }: SongHistoryDrawerProps) {
  const { data: history = [], isLoading } = useSongHistory(songId);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico — {songTitle}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && history.length === 0 && (
            <p className="text-sm text-muted-foreground">Música ainda não usada em nenhum culto.</p>
          )}
          {history.map((entry) => (
            <div key={entry.serviceId} className="flex flex-col gap-0.5 p-3 border rounded-lg">
              <span className="font-medium text-sm">{entry.serviceTitle}</span>
              <span className="text-xs text-muted-foreground">
                {format(parseISO(entry.serviceDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              {entry.contextTag && (
                <span className="text-xs text-violet-600 capitalize">{entry.contextTag}</span>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Em SongLibrary.tsx:** substituir o hook `useSongs` pelo `useSongsWithLastUsed` e adicionar "último uso" em cada card, mais um botão de histórico que abre o drawer.

Nos imports adicionar:
```tsx
import { useSongsWithLastUsed } from '@/hooks/useSongs';
import { SongHistoryDrawer } from '@/components/songs/SongHistoryDrawer';
import { History } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
```

Substituir hook de busca de músicas:
```tsx
// Antes:
const { data: songs = [] } = useSongs();
// Depois:
const { data: songs = [] } = useSongsWithLastUsed(currentOrg?.id ?? null);
```

Adicionar estado e drawer:
```tsx
const [historyDrawer, setHistoryDrawer] = useState<{ id: string; title: string } | null>(null);
```

No card de cada música, adicionar:
```tsx
{/* Logo após o título/tom da música */}
<div className="flex items-center justify-between">
  {song.lastUsedDate ? (
    <span className="text-xs text-muted-foreground">
      Último uso:{' '}
      {formatDistanceToNow(parseISO(song.lastUsedDate), { addSuffix: true, locale: ptBR })}
      {' '}· {song.usageCount}× no total
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">Nunca usada</span>
  )}
  <button
    onClick={(e) => { e.stopPropagation(); setHistoryDrawer({ id: song.id, title: song.title }); }}
    className="p-1 rounded hover:bg-accent"
    title="Ver histórico"
  >
    <History className="w-3.5 h-3.5 text-muted-foreground" />
  </button>
</div>
```

No final do JSX (antes do fechamento do fragment/div raiz):
```tsx
<SongHistoryDrawer
  songId={historyDrawer?.id ?? null}
  songTitle={historyDrawer?.title ?? ''}
  open={!!historyDrawer}
  onClose={() => setHistoryDrawer(null)}
/>
```

- [ ] **Verificar:** abrir /songs; cada card mostra "Último uso: X dias atrás · N× no total"; clicar no ícone de histórico abre o drawer com a lista de cultos.

- [ ] **Commit**
```bash
git add src/components/songs/SongHistoryDrawer.tsx src/pages/SongLibrary.tsx
git commit -m "feat: song last-used info and history drawer in SongLibrary"
```

---

## FEATURE D — Página de Ensaio [Nível 2]

Cada culto pode ter um cronograma de ensaio: data/hora do ensaio, horário de chegada, horário da passagem de som, e observações gerais. O setlist existente já define a ordem das músicas.

### Task D1: Migration — campos de ensaio em services

**Files:**
- Create: `supabase/migrations/20260529_000002_add_rehearsal_fields_to_services.sql`

- [ ] **Criar migration**

```sql
-- supabase/migrations/20260529_000002_add_rehearsal_fields_to_services.sql
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS rehearsal_date DATE,
  ADD COLUMN IF NOT EXISTS rehearsal_time TIME,
  ADD COLUMN IF NOT EXISTS arrival_time TIME,
  ADD COLUMN IF NOT EXISTS soundcheck_time TIME,
  ADD COLUMN IF NOT EXISTS rehearsal_notes TEXT;
```

- [ ] **Aplicar no Supabase (SQL Editor ou CLI)**

- [ ] **Commit**
```bash
git add supabase/migrations/20260529_000002_add_rehearsal_fields_to_services.sql
git commit -m "migration: add rehearsal scheduling fields to services"
```

---

### Task D2: Atualizar interface Service em useServices.ts

**Files:**
- Modify: `src/hooks/useServices.ts`

- [ ] **Adicionar campos ao interface `Service`:**

```typescript
interface Service {
  id: string;
  title: string;
  date: string;
  time: string;
  status: 'draft' | 'published';
  organization_id: string;
  created_at: string;
  updated_at: string;
  // Campos de ensaio:
  rehearsal_date: string | null;
  rehearsal_time: string | null;
  arrival_time: string | null;
  soundcheck_time: string | null;
  rehearsal_notes: string | null;
}
```

- [ ] **Garantir que o SELECT de serviço inclui os novos campos** (se o hook usa `.select('*')`, já está coberto; verificar se há select explícito e adicionar os campos).

- [ ] **Adicionar mutation `updateRehearsalInfo`:**

```typescript
export function useUpdateRehearsalInfo(serviceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      rehearsal_date: string | null;
      rehearsal_time: string | null;
      arrival_time: string | null;
      soundcheck_time: string | null;
      rehearsal_notes: string | null;
    }) => {
      const { error } = await supabase
        .from('services')
        .update(data)
        .eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service', serviceId] });
    },
  });
}
```

- [ ] **Commit**
```bash
git add src/hooks/useServices.ts
git commit -m "feat: Service interface and mutation for rehearsal fields"
```

---

### Task D3: Componente RehearsalSection

**Files:**
- Create: `src/components/service/RehearsalSection.tsx`

- [ ] **Criar componente**

```tsx
// src/components/service/RehearsalSection.tsx
import { useState } from 'react';
import { useUpdateRehearsalInfo } from '@/hooks/useServices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Save, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface RehearsalSectionProps {
  serviceId: string;
  isLeader: boolean;
  rehearsalDate: string | null;
  rehearsalTime: string | null;
  arrivalTime: string | null;
  soundcheckTime: string | null;
  rehearsalNotes: string | null;
}

export function RehearsalSection({
  serviceId,
  isLeader,
  rehearsalDate,
  rehearsalTime,
  arrivalTime,
  soundcheckTime,
  rehearsalNotes,
}: RehearsalSectionProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    rehearsal_date: rehearsalDate ?? '',
    rehearsal_time: rehearsalTime ?? '',
    arrival_time: arrivalTime ?? '',
    soundcheck_time: soundcheckTime ?? '',
    rehearsal_notes: rehearsalNotes ?? '',
  });

  const update = useUpdateRehearsalInfo(serviceId);

  const hasInfo = rehearsalDate || arrivalTime || soundcheckTime || rehearsalNotes;

  const handleSave = async () => {
    await update.mutateAsync({
      rehearsal_date: form.rehearsal_date || null,
      rehearsal_time: form.rehearsal_time || null,
      arrival_time: form.arrival_time || null,
      soundcheck_time: form.soundcheck_time || null,
      rehearsal_notes: form.rehearsal_notes || null,
    });
    toast.success('Ensaio atualizado.');
    setEditing(false);
  };

  if (!isLeader && !hasInfo) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Ensaio
        </CardTitle>
        {isLeader && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Editar
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {editing ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Data do ensaio</Label>
                <Input
                  type="date"
                  value={form.rehearsal_date}
                  onChange={(e) => setForm((f) => ({ ...f, rehearsal_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hora do ensaio</Label>
                <Input
                  type="time"
                  value={form.rehearsal_time}
                  onChange={(e) => setForm((f) => ({ ...f, rehearsal_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Chegada da equipe</Label>
                <Input
                  type="time"
                  value={form.arrival_time}
                  onChange={(e) => setForm((f) => ({ ...f, arrival_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Passagem de som</Label>
                <Input
                  type="time"
                  value={form.soundcheck_time}
                  onChange={(e) => setForm((f) => ({ ...f, soundcheck_time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações do ensaio</Label>
              <Textarea
                value={form.rehearsal_notes}
                onChange={(e) => setForm((f) => ({ ...f, rehearsal_notes: e.target.value }))}
                placeholder="Orientações gerais, pontos de atenção, dinâmicas..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={update.isPending}>
                <Save className="w-3.5 h-3.5 mr-1" />
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="w-3.5 h-3.5 mr-1" />
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-2 text-sm">
            {rehearsalDate && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-36">Data do ensaio:</span>
                <span>
                  {new Date(rehearsalDate + 'T12:00').toLocaleDateString('pt-BR')}
                  {rehearsalTime ? ` às ${rehearsalTime.slice(0, 5)}` : ''}
                </span>
              </div>
            )}
            {arrivalTime && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-36">Chegada da equipe:</span>
                <span>{arrivalTime.slice(0, 5)}</span>
              </div>
            )}
            {soundcheckTime && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-36">Passagem de som:</span>
                <span>{soundcheckTime.slice(0, 5)}</span>
              </div>
            )}
            {rehearsalNotes && (
              <div className="mt-3">
                <p className="text-muted-foreground text-xs mb-1">Observações:</p>
                <p className="whitespace-pre-wrap">{rehearsalNotes}</p>
              </div>
            )}
            {!hasInfo && isLeader && (
              <p className="text-muted-foreground text-xs">Nenhuma informação de ensaio. Clique em Editar para adicionar.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Integrar em ServiceDetail.tsx**

Importar e adicionar o componente na página de detalhe do culto, passando os props do serviço:
```tsx
import { RehearsalSection } from '@/components/service/RehearsalSection';

// No JSX, após o TeamSection ou após o setlist:
<RehearsalSection
  serviceId={service.id}
  isLeader={isLeader}
  rehearsalDate={service.rehearsal_date}
  rehearsalTime={service.rehearsal_time}
  arrivalTime={service.arrival_time}
  soundcheckTime={service.soundcheck_time}
  rehearsalNotes={service.rehearsal_notes}
/>
```

- [ ] **Verificar:** abrir detalhe de culto como admin; seção Ensaio aparece vazia com botão Editar; preencher campos → Salvar → dados persistem no reload; abrir como membro sem dados: seção não aparece; com dados: aparece só leitura.

- [ ] **Commit**
```bash
git add src/components/service/RehearsalSection.tsx src/pages/ServiceDetail.tsx
git commit -m "feat: rehearsal section with schedule info in service detail"
```

---

## FEATURE E — Exportação de Setlist [Nível 2]

Exportar o setlist como texto formatado. Por enquanto sem lyrics; o output serve para o operador de mídia saber a ordem e os tons.

### Task E1: Migration — lyrics em songs

**Files:**
- Create: `supabase/migrations/20260529_000003_add_lyrics_to_songs.sql`

- [ ] **Criar migration**

```sql
-- supabase/migrations/20260529_000003_add_lyrics_to_songs.sql
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS lyrics TEXT;

COMMENT ON COLUMN songs.lyrics IS
  'Letra da música em texto simples, com blocos separados por linha vazia (verso/refrão/ponte).';
```

- [ ] **Aplicar no Supabase**

- [ ] **Commit**
```bash
git add supabase/migrations/20260529_000003_add_lyrics_to_songs.sql
git commit -m "migration: add lyrics text field to songs"
```

---

### Task E2: Biblioteca de exportação

**Files:**
- Create: `src/lib/exportSetlist.ts`

- [ ] **Criar formatadores**

```typescript
// src/lib/exportSetlist.ts

export interface ExportItem {
  order: number;
  type: 'song' | 'moment';
  title: string;
  key?: string | null;
  contextTag?: string | null;
  notes?: string | null;
  lyrics?: string | null;
}

export interface ExportService {
  title: string;
  date: string;
  time: string | null;
  rehearsalDate: string | null;
  rehearsalTime: string | null;
  arrivalTime: string | null;
  soundcheckTime: string | null;
  rehearsalNotes: string | null;
  items: ExportItem[];
}

// ---------- Texto plano ----------
export function formatAsText(service: ExportService): string {
  const lines: string[] = [];
  const dateStr = new Date(service.date + 'T12:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  lines.push(`CANTIVO — ${service.title.toUpperCase()}`);
  lines.push(`${dateStr}${service.time ? ' · ' + service.time.slice(0, 5) : ''}`);
  lines.push('');

  if (service.arrivalTime || service.soundcheckTime || service.rehearsalDate) {
    lines.push('── ENSAIO ──────────────────────────');
    if (service.rehearsalDate) {
      const rDateStr = new Date(service.rehearsalDate + 'T12:00').toLocaleDateString('pt-BR');
      lines.push(`Data do ensaio: ${rDateStr}${service.rehearsalTime ? ' às ' + service.rehearsalTime.slice(0, 5) : ''}`);
    }
    if (service.arrivalTime) lines.push(`Chegada da equipe: ${service.arrivalTime.slice(0, 5)}`);
    if (service.soundcheckTime) lines.push(`Passagem de som: ${service.soundcheckTime.slice(0, 5)}`);
    if (service.rehearsalNotes) lines.push(`\nObservações: ${service.rehearsalNotes}`);
    lines.push('');
  }

  lines.push('── SETLIST ─────────────────────────');
  service.items.forEach((item, i) => {
    const num = String(i + 1).padStart(2, '0');
    if (item.type === 'moment') {
      lines.push(`${num}. [${item.title}]`);
    } else {
      const keyPart = item.key ? ` (${item.key})` : '';
      const tagPart = item.contextTag ? ` — ${item.contextTag}` : '';
      lines.push(`${num}. ${item.title}${keyPart}${tagPart}`);
      if (item.notes) lines.push(`    ↳ ${item.notes}`);
    }
  });

  return lines.join('\n');
}

// ---------- Holyrics (formato de texto de apresentação) ----------
// O Holyrics aceita importação de apresentações em texto com blocos separados.
// Formato: título na primeira linha, letras a seguir separadas por linha vazia.
export function formatAsHolyricsText(service: ExportService): string {
  const parts: string[] = [];

  service.items.forEach((item) => {
    if (item.type === 'moment') return;

    const header = `== ${item.title}${item.key ? ' (' + item.key + ')' : ''} ==`;
    const body = item.lyrics
      ? item.lyrics.trim()
      : `[Inserir letra de ${item.title}]`;

    parts.push([header, body].join('\n'));
  });

  return parts.join('\n\n---\n\n');
}

// ---------- Download helper ----------
export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Commit**
```bash
git add src/lib/exportSetlist.ts
git commit -m "feat: setlist export formatters (plain text and Holyrics)"
```

---

### Task E3: ExportDialog + integração em ServiceDetail

**Files:**
- Create: `src/components/service/ExportDialog.tsx`
- Modify: `src/pages/ServiceDetail.tsx`

- [ ] **Criar ExportDialog**

```tsx
// src/components/service/ExportDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { formatAsText, formatAsHolyricsText, downloadText, ExportService } from '@/lib/exportSetlist';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  exportData: ExportService;
  serviceName: string;
}

export function ExportDialog({ open, onClose, exportData, serviceName }: ExportDialogProps) {
  const slug = serviceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleExportText = () => {
    const content = formatAsText(exportData);
    downloadText(`cantivo-${slug}.txt`, content);
  };

  const handleExportHolyrics = () => {
    const content = formatAsHolyricsText(exportData);
    downloadText(`cantivo-${slug}-holyrics.txt`, content);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Exportar Setlist</DialogTitle>
          <DialogDescription>Escolha o formato de exportação.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <Button variant="outline" className="w-full justify-start gap-3" onClick={handleExportText}>
            <FileText className="w-4 h-4" />
            <div className="text-left">
              <div className="font-medium text-sm">Texto simples (.txt)</div>
              <div className="text-xs text-muted-foreground">Ordem de músicas com tons e notas</div>
            </div>
            <Download className="w-3.5 h-3.5 ml-auto" />
          </Button>

          <Button variant="outline" className="w-full justify-start gap-3" onClick={handleExportHolyrics}>
            <FileText className="w-4 h-4" />
            <div className="text-left">
              <div className="font-medium text-sm">Holyrics (.txt)</div>
              <div className="text-xs text-muted-foreground">Formato de letras para o Holyrics</div>
            </div>
            <Download className="w-3.5 h-3.5 ml-auto" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Em ServiceDetail.tsx:** adicionar botão de exportação e montar o objeto `ExportService` a partir dos dados do serviço/setlist:

```tsx
// Imports a adicionar:
import { ExportDialog } from '@/components/service/ExportDialog';
import { Download } from 'lucide-react';

// Estado:
const [exportOpen, setExportOpen] = useState(false);

// Montar ExportService para o dialog (perto da lógica de dados já existente):
const exportData: ExportService = {
  title: service.title,
  date: service.date,
  time: service.time,
  rehearsalDate: service.rehearsal_date,
  rehearsalTime: service.rehearsal_time,
  arrivalTime: service.arrival_time,
  soundcheckTime: service.soundcheck_time,
  rehearsalNotes: service.rehearsal_notes,
  items: (serviceItems ?? []).map((item, i) => ({
    order: i + 1,
    type: item.type,
    title: item.type === 'song'
      ? (songs?.find((s) => s.id === item.song_id)?.title ?? 'Música')
      : (item.moment_title ?? 'Momento'),
    key: item.type === 'song'
      ? (songs?.find((s) => s.id === item.song_id)?.key ?? null)
      : null,
    contextTag: item.context_tag,
    notes: item.notes,
    lyrics: item.type === 'song'
      ? (songs?.find((s) => s.id === item.song_id)?.lyrics ?? null)
      : null,
  })),
};

// No header do ServiceDetail, adicionar botão de exportação (ao lado de outros botões de ação):
{isLeader && (
  <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
    <Download className="w-3.5 h-3.5 mr-1" />
    Exportar
  </Button>
)}

// No final do JSX:
<ExportDialog
  open={exportOpen}
  onClose={() => setExportOpen(false)}
  exportData={exportData}
  serviceName={service.title}
/>
```

- [ ] **Verificar:** abrir culto com setlist → clicar Exportar → dialog aparece → clicar "Texto simples" → arquivo .txt é baixado com músicas na ordem correta com tons.

- [ ] **Commit**
```bash
git add src/components/service/ExportDialog.tsx src/pages/ServiceDetail.tsx
git commit -m "feat: export setlist as plain text or Holyrics format"
```

---

## FEATURE F — Relatório de Participação [Nível 2]

### Task F1: Hook useParticipationReport

**Files:**
- Create: `src/hooks/useParticipationReport.ts`

- [ ] **Criar hook**

```typescript
// src/hooks/useParticipationReport.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface MemberParticipation {
  memberId: string;
  name: string;
  email: string;
  totalScheduled: number;
  confirmed: number;
  declined: number;
  pending: number;
  attendanceRate: number; // confirmed / (confirmed + declined) * 100
}

export function useParticipationReport(startDate: string, endDate: string) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['participation-report', currentOrg?.id, startDate, endDate],
    enabled: !!currentOrg?.id,
    queryFn: async (): Promise<MemberParticipation[]> => {
      // Busca service_volunteers dentro do período via serviços
      const { data, error } = await supabase
        .from('service_volunteers')
        .select(`
          member_id,
          status,
          services!inner (
            date,
            organization_id
          ),
          organization_members!inner (
            profiles (
              name,
              email
            )
          )
        `)
        .eq('services.organization_id', currentOrg!.id)
        .gte('services.date', startDate)
        .lte('services.date', endDate);

      if (error) throw error;

      // Agregar por membro
      const byMember = new Map<string, MemberParticipation>();

      for (const row of data ?? []) {
        if (!row.member_id) continue;
        const profile = (row.organization_members as any)?.profiles;
        const name = profile?.name ?? 'Sem nome';
        const email = profile?.email ?? '';

        if (!byMember.has(row.member_id)) {
          byMember.set(row.member_id, {
            memberId: row.member_id,
            name,
            email,
            totalScheduled: 0,
            confirmed: 0,
            declined: 0,
            pending: 0,
            attendanceRate: 0,
          });
        }

        const entry = byMember.get(row.member_id)!;
        entry.totalScheduled++;
        if (row.status === 'confirmed') entry.confirmed++;
        else if (row.status === 'declined') entry.declined++;
        else entry.pending++;
      }

      return Array.from(byMember.values())
        .map((entry) => ({
          ...entry,
          attendanceRate:
            entry.confirmed + entry.declined > 0
              ? Math.round((entry.confirmed / (entry.confirmed + entry.declined)) * 100)
              : 0,
        }))
        .sort((a, b) => b.totalScheduled - a.totalScheduled);
    },
  });
}
```

- [ ] **Commit**
```bash
git add src/hooks/useParticipationReport.ts
git commit -m "feat: participation report hook with attendance rate"
```

---

### Task F2: Página de Relatórios

**Files:**
- Create: `src/pages/Reports.tsx`

- [ ] **Criar página**

```tsx
// src/pages/Reports.tsx
import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useParticipationReport } from '@/hooks/useParticipationReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, subMonths } from 'date-fns';

function defaultRange() {
  const end = new Date();
  const start = subMonths(end, 3);
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}

export default function Reports() {
  const { start: defaultStart, end: defaultEnd } = defaultRange();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const { data: report = [], isLoading } = useParticipationReport(startDate, endDate);

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Relatório de Participação</h1>
          <p className="text-muted-foreground text-sm">Frequência e confirmações da equipe no período.</p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {!isLoading && report.length > 0 && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-sm">Escalas por membro</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, report.length * 36)}>
                  <BarChart data={report} layout="vertical" margin={{ left: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name) => [value, name === 'confirmed' ? 'Confirmados' : name === 'declined' ? 'Recusados' : 'Pendentes']}
                    />
                    <Bar dataKey="confirmed" stackId="a" fill="#22c55e" name="confirmed" />
                    <Bar dataKey="declined" stackId="a" fill="#ef4444" name="declined" />
                    <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="pending" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Detalhamento por membro</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-xs border-b">
                      <th className="text-left py-2">Membro</th>
                      <th className="text-center py-2">Escalado</th>
                      <th className="text-center py-2">Confirmou</th>
                      <th className="text-center py-2">Recusou</th>
                      <th className="text-center py-2">Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((m) => (
                      <tr key={m.memberId} className="border-b last:border-0">
                        <td className="py-2">
                          <div>{m.name}</div>
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </td>
                        <td className="text-center py-2">{m.totalScheduled}</td>
                        <td className="text-center py-2 text-green-600">{m.confirmed}</td>
                        <td className="text-center py-2 text-red-500">{m.declined}</td>
                        <td className="text-center py-2 font-medium">
                          <span className={m.attendanceRate >= 80 ? 'text-green-600' : m.attendanceRate >= 50 ? 'text-yellow-600' : 'text-red-500'}>
                            {m.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}

        {!isLoading && report.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum dado para o período selecionado.</p>
        )}
      </div>
    </AppLayout>
  );
}
```

- [ ] **Commit**
```bash
git add src/pages/Reports.tsx
git commit -m "feat: participation report page with bar chart and table"
```

---

### Task F3: Rota e link na Sidebar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Em App.tsx:** importar e adicionar rota `/reports`:

```tsx
import Reports from './pages/Reports';

// Dentro do <Routes>:
<Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
```

- [ ] **Em Sidebar.tsx:** adicionar link (apenas para admin/owner). Localizar os NavLinks existentes e adicionar:

```tsx
import { BarChart2 } from 'lucide-react';

// Localizar bloco de links do menu. Adicionar (visível apenas para isLeader):
{isLeader && (
  <NavLink to="/reports" icon={<BarChart2 className="w-4 h-4" />}>
    Relatórios
  </NavLink>
)}
```

- [ ] **Verificar:** sidebar exibe "Relatórios" para admin; rota /reports carrega a página; mudar período muda os dados no gráfico.

- [ ] **Commit**
```bash
git add src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: add /reports route and sidebar link for admins"
```

---

## FEATURE G — Solicitação de Troca de Escala [Nível 2]

Membro escalado pode solicitar troca com outro membro da mesma função. O líder aprova.

### Task G1: Migration — swap_requests

**Files:**
- Create: `supabase/migrations/20260529_000004_create_swap_requests.sql`

- [ ] **Criar migration**

```sql
-- supabase/migrations/20260529_000004_create_swap_requests.sql
CREATE TABLE swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  requester_volunteer_id UUID NOT NULL REFERENCES service_volunteers(id) ON DELETE CASCADE,
  candidate_member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'approved', 'cancelled')),
  requester_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_swap_requests_service ON swap_requests(service_id);
CREATE INDEX idx_swap_requests_requester ON swap_requests(requester_volunteer_id);
CREATE INDEX idx_swap_requests_candidate ON swap_requests(candidate_member_id);

CREATE TRIGGER update_swap_requests_updated_at
  BEFORE UPDATE ON swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;

-- Ver: membros da org do serviço associado
CREATE POLICY "org members can view swap requests"
  ON swap_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM services s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = swap_requests.service_id
        AND om.user_id = auth.uid()
    )
  );

-- Criar: somente quem está escalado no serviço
CREATE POLICY "volunteer can create swap request"
  ON swap_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_volunteers sv
      WHERE sv.id = swap_requests.requester_volunteer_id
        AND EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.id = sv.member_id AND om.user_id = auth.uid()
        )
    )
  );

-- Atualizar: candidato pode aceitar/recusar; admin/owner pode aprovar
CREATE POLICY "candidate or admin can update swap request"
  ON swap_requests FOR UPDATE
  USING (
    -- Candidato
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.id = swap_requests.candidate_member_id AND om.user_id = auth.uid()
    )
    OR
    -- Admin/owner
    EXISTS (
      SELECT 1 FROM services s
      WHERE s.id = swap_requests.service_id
        AND is_org_admin_or_owner(auth.uid(), s.organization_id)
    )
  );
```

- [ ] **Aplicar no Supabase**

- [ ] **Commit**
```bash
git add supabase/migrations/20260529_000004_create_swap_requests.sql
git commit -m "migration: swap_requests table with RLS"
```

---

### Task G2: Hook useSwapRequests

**Files:**
- Create: `src/hooks/useSwapRequests.ts`

- [ ] **Criar hook**

```typescript
// src/hooks/useSwapRequests.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';

export interface SwapRequest {
  id: string;
  serviceId: string;
  requesterVolunteerId: string;
  candidateMemberId: string;
  status: 'pending' | 'accepted' | 'declined' | 'approved' | 'cancelled';
  requesterNote: string | null;
  createdAt: string;
  candidateName?: string;
  requesterName?: string;
}

export function useSwapRequestsForService(serviceId: string) {
  return useQuery({
    queryKey: ['swap-requests', serviceId],
    enabled: !!serviceId,
    queryFn: async (): Promise<SwapRequest[]> => {
      const { data, error } = await supabase
        .from('swap_requests')
        .select(`
          id, status, requester_note, created_at,
          service_id, requester_volunteer_id, candidate_member_id,
          organization_members!candidate_member_id (
            profiles ( name )
          )
        `)
        .eq('service_id', serviceId)
        .in('status', ['pending', 'accepted']);

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        serviceId: row.service_id,
        requesterVolunteerId: row.requester_volunteer_id,
        candidateMemberId: row.candidate_member_id,
        status: row.status as SwapRequest['status'],
        requesterNote: row.requester_note,
        createdAt: row.created_at,
        candidateName: (row.organization_members as any)?.profiles?.name ?? 'Membro',
      }));
    },
  });
}

export function useCreateSwapRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      serviceId: string;
      requesterVolunteerId: string;
      candidateMemberId: string;
      requesterNote?: string;
    }) => {
      const { error } = await supabase.from('swap_requests').insert({
        service_id: payload.serviceId,
        requester_volunteer_id: payload.requesterVolunteerId,
        candidate_member_id: payload.candidateMemberId,
        requester_note: payload.requesterNote ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['swap-requests', variables.serviceId] });
    },
  });
}

export function useUpdateSwapRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      serviceId,
    }: {
      requestId: string;
      status: SwapRequest['status'];
      serviceId: string;
    }) => {
      const { error } = await supabase
        .from('swap_requests')
        .update({ status })
        .eq('id', requestId);
      if (error) throw error;

      // Se aprovado, atualizar os service_volunteers
      if (status === 'approved') {
        const { data: req } = await supabase
          .from('swap_requests')
          .select('requester_volunteer_id, candidate_member_id')
          .eq('id', requestId)
          .single();

        if (req) {
          // Remove o escalado original e insere o candidato
          await supabase
            .from('service_volunteers')
            .update({ member_id: req.candidate_member_id, status: 'confirmed' })
            .eq('id', req.requester_volunteer_id);
        }
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['swap-requests', variables.serviceId] });
      qc.invalidateQueries({ queryKey: ['service', variables.serviceId] });
    },
  });
}
```

- [ ] **Commit**
```bash
git add src/hooks/useSwapRequests.ts
git commit -m "feat: swap request hooks (create, list, update/approve)"
```

---

### Task G3: SwapRequestDialog + integrações

**Files:**
- Create: `src/components/service/SwapRequestDialog.tsx`
- Modify: `src/pages/MySchedule.tsx`
- Modify: `src/pages/ServiceDetail.tsx`

- [ ] **Criar SwapRequestDialog**

```tsx
// src/components/service/SwapRequestDialog.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateSwapRequest } from '@/hooks/useSwapRequests';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

interface Member { id: string; name: string; }

interface SwapRequestDialogProps {
  open: boolean;
  onClose: () => void;
  serviceId: string;
  volunteerRecordId: string;
  eligibleMembers: Member[]; // membros com mesma habilidade que podem substituir
}

export function SwapRequestDialog({
  open,
  onClose,
  serviceId,
  volunteerRecordId,
  eligibleMembers,
}: SwapRequestDialogProps) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [note, setNote] = useState('');
  const create = useCreateSwapRequest();

  const handleSubmit = async () => {
    if (!selectedMemberId) return;
    await create.mutateAsync({
      serviceId,
      requesterVolunteerId: volunteerRecordId,
      candidateMemberId: selectedMemberId,
      requesterNote: note || undefined,
    });
    toast.success('Solicitação de troca enviada!');
    onClose();
    setSelectedMemberId('');
    setNote('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Troca de Escala</DialogTitle>
          <DialogDescription>
            Selecione quem pode te substituir. O líder precisará aprovar a troca.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {eligibleMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum outro membro disponível com a mesma função.
            </p>
          ) : (
            <RadioGroup value={selectedMemberId} onValueChange={setSelectedMemberId}>
              {eligibleMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <RadioGroupItem value={m.id} id={m.id} />
                  <Label htmlFor={m.id}>{m.name}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Tenho viagem nesse dia..."
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!selectedMemberId || create.isPending}
            >
              Enviar solicitação
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Em MySchedule.tsx:** nos itens onde o membro está escalado como `pending` ou `confirmed`, adicionar botão "Solicitar troca" que abre o `SwapRequestDialog`. Os `eligibleMembers` devem ser filtrados da lista de membros da organização com a mesma skill (buscar via hook existente `useOrganization`).

- [ ] **Em ServiceDetail.tsx (visão do líder):** usar `useSwapRequestsForService(serviceId)` para exibir um badge no header do culto com "X troca(s) pendente(s)" quando houver. Clicar leva a uma seção ou sheet que lista as solicitações com botões Aprovar/Recusar.

- [ ] **Verificar:** como membro, abrir MySchedule, clicar "Solicitar troca" → dialog aparece com membros elegíveis → enviar → como líder, abrir ServiceDetail e ver o alerta de troca pendente → aprovar → a escala do serviço reflete o novo membro.

- [ ] **Commit**
```bash
git add src/components/service/SwapRequestDialog.tsx src/pages/MySchedule.tsx src/pages/ServiceDetail.tsx
git commit -m "feat: schedule swap request flow for members with leader approval"
```

---

## FEATURE H — YouTube Embed no Repertório [Nível 3]

### Task H1: Componente YouTubePlayer

**Files:**
- Create: `src/components/songs/YouTubePlayer.tsx`

- [ ] **Criar componente**

```tsx
// src/components/songs/YouTubePlayer.tsx

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

interface YouTubePlayerProps {
  url: string;
  className?: string;
}

export function YouTubePlayer({ url, className = '' }: YouTubePlayerProps) {
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-600 underline">
        Abrir no YouTube
      </a>
    );
  }

  return (
    <div className={`aspect-video rounded-lg overflow-hidden ${className}`}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
      />
    </div>
  );
}
```

- [ ] **Em SongLibrary.tsx:** quando o usuário clica em uma música que tem `youtube_url`, expandir um painel abaixo do card mostrando o `YouTubePlayer`. Adicionar estado `expandedSongId` e toggle no click.

- [ ] **Em SongDrawer.tsx (ou similar):** quando o drawer de adicionar música ao culto exibe o detalhe de uma música com youtube_url, mostrar o `YouTubePlayer` no drawer.

- [ ] **Verificar:** na SongLibrary, clicar em música com youtube_url → player aparece inline; clicar novamente → fecha; URL sem formato reconhecido → exibe link externo.

- [ ] **Commit**
```bash
git add src/components/songs/YouTubePlayer.tsx src/pages/SongLibrary.tsx src/components/service/SongDrawer.tsx
git commit -m "feat: inline YouTube player in song library and song drawer"
```

---

## FEATURE I — Setlist Colaborativo [Nível 3]

Membros podem sugerir músicas para um culto. O líder aprova ou rejeita. Apenas cultos publicados ou próximos.

### Task I1: Migration — song_suggestions

**Files:**
- Create: `supabase/migrations/20260529_000005_create_song_suggestions.sql`

- [ ] **Criar migration**

```sql
-- supabase/migrations/20260529_000005_create_song_suggestions.sql
CREATE TABLE song_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  suggested_by UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(service_id, song_id, suggested_by)
);

CREATE INDEX idx_song_suggestions_service ON song_suggestions(service_id);

ALTER TABLE song_suggestions ENABLE ROW LEVEL SECURITY;

-- Todos os membros da org podem ver sugestões do culto
CREATE POLICY "org members can view suggestions"
  ON song_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM services s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = song_suggestions.service_id AND om.user_id = auth.uid()
    )
  );

-- Membros podem sugerir
CREATE POLICY "members can suggest songs"
  ON song_suggestions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM services s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = song_suggestions.service_id AND om.user_id = auth.uid()
        AND om.id = song_suggestions.suggested_by
    )
  );

-- Admin/owner podem aprovar/rejeitar (update status)
CREATE POLICY "admin can update suggestion status"
  ON song_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM services s
      WHERE s.id = song_suggestions.service_id
        AND is_org_admin_or_owner(auth.uid(), s.organization_id)
    )
  );

-- Quem sugeriu pode cancelar (delete)
CREATE POLICY "suggester can delete own suggestion"
  ON song_suggestions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.id = song_suggestions.suggested_by AND om.user_id = auth.uid()
    )
  );
```

- [ ] **Aplicar no Supabase**

- [ ] **Commit**
```bash
git add supabase/migrations/20260529_000005_create_song_suggestions.sql
git commit -m "migration: song_suggestions table for collaborative setlist"
```

---

### Task I2: Hook useSongSuggestions

**Files:**
- Create: `src/hooks/useSongSuggestions.ts`

- [ ] **Criar hook**

```typescript
// src/hooks/useSongSuggestions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SongSuggestion {
  id: string;
  serviceId: string;
  suggestedById: string;
  suggestedByName: string;
  songId: string;
  songTitle: string;
  songKey: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export function useSongSuggestions(serviceId: string) {
  return useQuery({
    queryKey: ['song-suggestions', serviceId],
    enabled: !!serviceId,
    queryFn: async (): Promise<SongSuggestion[]> => {
      const { data, error } = await supabase
        .from('song_suggestions')
        .select(`
          id, service_id, song_id, note, status, created_at,
          suggested_by,
          organization_members!suggested_by (
            profiles ( name )
          ),
          songs ( title, key )
        `)
        .eq('service_id', serviceId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        serviceId: row.service_id,
        suggestedById: row.suggested_by,
        suggestedByName: (row.organization_members as any)?.profiles?.name ?? 'Membro',
        songId: row.song_id,
        songTitle: (row.songs as any)?.title ?? 'Música',
        songKey: (row.songs as any)?.key ?? null,
        note: row.note,
        status: row.status as SongSuggestion['status'],
        createdAt: row.created_at,
      }));
    },
  });
}

export function useCreateSongSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      serviceId: string;
      suggestedBy: string;
      songId: string;
      note?: string;
    }) => {
      const { error } = await supabase.from('song_suggestions').insert({
        service_id: payload.serviceId,
        suggested_by: payload.suggestedBy,
        song_id: payload.songId,
        note: payload.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['song-suggestions', v.serviceId] }),
  });
}

export function useUpdateSuggestionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      suggestionId,
      status,
      serviceId,
      songId,
    }: {
      suggestionId: string;
      status: 'approved' | 'rejected';
      serviceId: string;
      songId: string;
    }) => {
      const { error } = await supabase
        .from('song_suggestions')
        .update({ status })
        .eq('id', suggestionId);
      if (error) throw error;

      // Se aprovado, adicionar ao setlist automaticamente
      if (status === 'approved') {
        // Descobrir a maior posição atual
        const { data: lastItem } = await supabase
          .from('service_items')
          .select('item_order')
          .eq('service_id', serviceId)
          .order('item_order', { ascending: false })
          .limit(1)
          .single();

        const nextOrder = (lastItem?.item_order ?? 0) + 1;

        const { error: insertError } = await supabase.from('service_items').insert({
          service_id: serviceId,
          type: 'song',
          song_id: songId,
          item_order: nextOrder,
        });
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['song-suggestions', v.serviceId] });
      qc.invalidateQueries({ queryKey: ['service', v.serviceId] });
    },
  });
}
```

- [ ] **Commit**
```bash
git add src/hooks/useSongSuggestions.ts
git commit -m "feat: song suggestions hooks with auto-add to setlist on approval"
```

---

### Task I3: SongSuggestionsPanel + integração em ServiceDetail

**Files:**
- Create: `src/components/service/SongSuggestionsPanel.tsx`
- Modify: `src/pages/ServiceDetail.tsx`

- [ ] **Criar SongSuggestionsPanel**

```tsx
// src/components/service/SongSuggestionsPanel.tsx
import { useState } from 'react';
import { useSongSuggestions, useCreateSongSuggestion, useUpdateSuggestionStatus } from '@/hooks/useSongSuggestions';
import { useSongs } from '@/hooks/useSongs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Lightbulb, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface SongSuggestionsPanelProps {
  serviceId: string;
  currentMemberId: string;
  isLeader: boolean;
}

export function SongSuggestionsPanel({
  serviceId,
  currentMemberId,
  isLeader,
}: SongSuggestionsPanelProps) {
  const { data: suggestions = [] } = useSongSuggestions(serviceId);
  const { data: songs = [] } = useSongs();
  const create = useCreateSongSuggestion();
  const updateStatus = useUpdateSuggestionStatus();

  const [showForm, setShowForm] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState('');
  const [note, setNote] = useState('');

  const pending = suggestions.filter((s) => s.status === 'pending');
  const approved = suggestions.filter((s) => s.status === 'approved');

  const handleSuggest = async () => {
    if (!selectedSongId) return;
    await create.mutateAsync({
      serviceId,
      suggestedBy: currentMemberId,
      songId: selectedSongId,
      note: note || undefined,
    });
    toast.success('Sugestão enviada!');
    setSelectedSongId('');
    setNote('');
    setShowForm(false);
  };

  const handleApprove = async (s: typeof suggestions[0]) => {
    await updateStatus.mutateAsync({
      suggestionId: s.id,
      status: 'approved',
      serviceId,
      songId: s.songId,
    });
    toast.success(`"${s.songTitle}" adicionado ao setlist.`);
  };

  const handleReject = async (s: typeof suggestions[0]) => {
    await updateStatus.mutateAsync({
      suggestionId: s.id,
      status: 'rejected',
      serviceId,
      songId: s.songId,
    });
    toast.success('Sugestão recusada.');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Sugestões de músicas
          {pending.length > 0 && (
            <Badge variant="secondary">{pending.length}</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Sugerir
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <Select value={selectedSongId} onValueChange={setSelectedSongId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma música..." />
              </SelectTrigger>
              <SelectContent>
                {songs.map((song) => (
                  <SelectItem key={song.id} value={song.id}>
                    {song.title} {song.key ? `(${song.key})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Por que essa música? (opcional)"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSuggest} disabled={!selectedSongId || create.isPending}>
                Enviar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {pending.length === 0 && approved.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma sugestão ainda.</p>
        )}

        {pending.map((s) => (
          <div key={s.id} className="flex items-start justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{s.songTitle}</span>
                {s.songKey && <span className="text-xs text-muted-foreground">{s.songKey}</span>}
              </div>
              <span className="text-xs text-muted-foreground">por {s.suggestedByName}</span>
              {s.note && <p className="text-xs italic">"{s.note}"</p>}
            </div>
            {isLeader && (
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleApprove(s)}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleReject(s)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {approved.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Aprovadas e adicionadas ao setlist:</p>
            {approved.map((s) => (
              <div key={s.id} className="text-sm flex items-center gap-1 text-green-700">
                <Check className="w-3 h-3" />
                {s.songTitle}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Em ServiceDetail.tsx:** importar e adicionar o painel após o setlist. O `currentMemberId` vem do member logado (buscar via `useOrganization` ou adicionar ao hook `useAuth`).

- [ ] **Verificar:** como membro, abrir culto → clicar "Sugerir" → selecionar música → enviar → sugestão aparece como pendente; como líder → clicar ✓ → música some das pendentes e aparece no setlist; badge de contagem diminui.

- [ ] **Commit**
```bash
git add src/components/service/SongSuggestionsPanel.tsx src/pages/ServiceDetail.tsx
git commit -m "feat: collaborative song suggestions with leader approval and auto-add to setlist"
```

---

## FEATURE J — Auto-Schedule [Nível 3]

Sugere automaticamente quais membros escalar, combinando: habilidade necessária + disponibilidade + fadiga (< 3 escalas em 30 dias). Sempre apresenta sugestão para o líder revisar antes de publicar.

### Task J1: Algoritmo autoSchedule

**Files:**
- Create: `src/lib/autoSchedule.ts`

- [ ] **Criar algoritmo**

```typescript
// src/lib/autoSchedule.ts

export interface MemberProfile {
  memberId: string;
  name: string;
  skills: string[];          // ex: ['vocalist', 'guitar']
  unavailableDates: string[]; // formato 'YYYY-MM-DD'
  recentServiceCount: number; // escalas nos últimos 30 dias
}

export interface ScheduleSlot {
  role: string;         // ex: 'vocalist', 'guitarist'
  requiredSkill: string;
  assignedMemberId: string | null;
  assignedMemberName: string | null;
  confidence: 'high' | 'medium' | 'low'; // para UI colorir o card
}

export interface AutoScheduleResult {
  serviceDate: string;
  slots: ScheduleSlot[];
  warnings: string[];
}

export function runAutoSchedule(
  serviceDate: string,
  requiredRoles: Array<{ role: string; requiredSkill: string }>,
  members: MemberProfile[],
): AutoScheduleResult {
  const warnings: string[] = [];
  const assigned = new Set<string>(); // evita duplicar o mesmo membro

  const slots: ScheduleSlot[] = requiredRoles.map(({ role, requiredSkill }) => {
    const eligible = members
      .filter((m) => {
        const hasSkill = m.skills.includes(requiredSkill);
        const isAvailable = !m.unavailableDates.includes(serviceDate);
        const notAlreadyAssigned = !assigned.has(m.memberId);
        return hasSkill && isAvailable && notAlreadyAssigned;
      })
      .sort((a, b) => {
        // Prioriza quem tem MENOS escalas recentes (menor fadiga)
        return a.recentServiceCount - b.recentServiceCount;
      });

    if (eligible.length === 0) {
      warnings.push(`Nenhum membro disponível com a habilidade "${requiredSkill}" para ${role}.`);
      return { role, requiredSkill, assignedMemberId: null, assignedMemberName: null, confidence: 'low' };
    }

    const picked = eligible[0];
    assigned.add(picked.memberId);

    const confidence: ScheduleSlot['confidence'] =
      picked.recentServiceCount === 0 ? 'high' :
      picked.recentServiceCount <= 2 ? 'medium' : 'low';

    if (picked.recentServiceCount >= 2) {
      warnings.push(`${picked.name} já serviu ${picked.recentServiceCount}× nos últimos 30 dias (${role}).`);
    }

    return {
      role,
      requiredSkill,
      assignedMemberId: picked.memberId,
      assignedMemberName: picked.name,
      confidence,
    };
  });

  return { serviceDate, slots, warnings };
}
```

- [ ] **Commit**
```bash
git add src/lib/autoSchedule.ts
git commit -m "feat: auto-schedule algorithm with skill, availability and fatigue scoring"
```

---

### Task J2: Hook de dados para o auto-schedule

**Files:**
- Modify: `src/hooks/useServices.ts` (ou novo arquivo `src/hooks/useAutoScheduleData.ts`)

- [ ] **Criar hook que busca os dados necessários para rodar o algoritmo**

```typescript
// Adicionar em src/hooks/useServices.ts ou em novo arquivo:
export function useAutoScheduleData(organizationId: string | null, serviceDate: string) {
  return useQuery({
    queryKey: ['auto-schedule-data', organizationId, serviceDate],
    enabled: !!organizationId && !!serviceDate,
    queryFn: async () => {
      // 1. Membros da org com skills
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          id,
          profiles ( name ),
          member_skills ( skills, volunteer_role )
        `)
        .eq('organization_id', organizationId!);

      if (membersError) throw membersError;

      // 2. Indisponibilidades
      const { data: unavail } = await supabase
        .from('unavailability')
        .select('member_id, date');

      // 3. Escalas recentes (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: recent } = await supabase
        .from('service_volunteers')
        .select(`
          member_id,
          services!inner ( date, organization_id )
        `)
        .eq('services.organization_id', organizationId!)
        .gte('services.date', cutoff)
        .eq('status', 'confirmed');

      // Construir mapa de contagem recente
      const recentCountMap = new Map<string, number>();
      for (const row of recent ?? []) {
        if (!row.member_id) continue;
        recentCountMap.set(row.member_id, (recentCountMap.get(row.member_id) ?? 0) + 1);
      }

      // Construir mapa de indisponibilidades
      const unavailMap = new Map<string, string[]>();
      for (const row of unavail ?? []) {
        if (!unavailMap.has(row.member_id)) unavailMap.set(row.member_id, []);
        unavailMap.get(row.member_id)!.push(row.date);
      }

      // Montar MemberProfile[]
      return (members ?? []).map((m): import('../lib/autoSchedule').MemberProfile => {
        const skillsEntry = (m.member_skills as any)?.[0];
        const skills: string[] = [];
        if (skillsEntry?.volunteer_role) skills.push(skillsEntry.volunteer_role);
        if (skillsEntry?.skills) skills.push(...(skillsEntry.skills as string[]));

        return {
          memberId: m.id,
          name: (m.profiles as any)?.name ?? 'Sem nome',
          skills,
          unavailableDates: unavailMap.get(m.id) ?? [],
          recentServiceCount: recentCountMap.get(m.id) ?? 0,
        };
      });
    },
  });
}
```

- [ ] **Commit**
```bash
git add src/hooks/useServices.ts
git commit -m "feat: useAutoScheduleData hook aggregates skills, availability and fatigue"
```

---

### Task J3: AutoScheduleDialog + integração em ServiceCreate

**Files:**
- Create: `src/components/service/AutoScheduleDialog.tsx`
- Modify: `src/pages/ServiceCreate.tsx`

- [ ] **Criar AutoScheduleDialog**

```tsx
// src/components/service/AutoScheduleDialog.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { runAutoSchedule, type AutoScheduleResult, type MemberProfile } from '@/lib/autoSchedule';

const REQUIRED_ROLES = [
  { role: 'Vocal principal', requiredSkill: 'vocalist' },
  { role: 'Instrumentista', requiredSkill: 'instrumentalist' },
  { role: 'Técnico de som', requiredSkill: 'technician' },
];

const confidenceColor = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800',
};

interface AutoScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  serviceDate: string;
  members: MemberProfile[];
  onApply: (memberIds: string[]) => void;
}

export function AutoScheduleDialog({
  open,
  onClose,
  serviceDate,
  members,
  onApply,
}: AutoScheduleDialogProps) {
  const [result, setResult] = useState<AutoScheduleResult | null>(null);

  const handleGenerate = () => {
    const r = runAutoSchedule(serviceDate, REQUIRED_ROLES, members);
    setResult(r);
  };

  const handleApply = () => {
    if (!result) return;
    const ids = result.slots
      .map((s) => s.assignedMemberId)
      .filter((id): id is string => !!id);
    onApply(ids);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setResult(null); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Auto-Escala
          </DialogTitle>
          <DialogDescription>
            Sugestão automática baseada em habilidades, disponibilidade e fadiga. Você pode ajustar antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {!result ? (
            <Button onClick={handleGenerate} className="w-full">
              Gerar sugestão
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                {result.slots.map((slot) => (
                  <div key={slot.role} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{slot.role}</div>
                      <div className="text-xs text-muted-foreground">{slot.requiredSkill}</div>
                    </div>
                    {slot.assignedMemberName ? (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${confidenceColor[slot.confidence]}`}>
                        {slot.assignedMemberName}
                      </span>
                    ) : (
                      <span className="text-xs text-red-500">Sem candidato</span>
                    )}
                  </div>
                ))}
              </div>

              {result.warnings.length > 0 && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-xs">{w}</p>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={handleApply} className="flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Aplicar sugestão
                </Button>
                <Button variant="outline" onClick={handleGenerate}>
                  Regerar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Em ServiceCreate.tsx:** importar e adicionar o botão "Auto-escalar" próximo ao seletor de membros. O `onApply` deve preencher o campo de membros selecionados com os IDs retornados.

```tsx
// Imports:
import { AutoScheduleDialog } from '@/components/service/AutoScheduleDialog';
import { useAutoScheduleData } from '@/hooks/useServices';

// Estado:
const [autoScheduleOpen, setAutoScheduleOpen] = useState(false);

// Busca de dados (com a data do formulário):
const { data: membersForSchedule = [] } = useAutoScheduleData(currentOrg?.id ?? null, watchedDate);

// Botão no formulário, ao lado do campo de seleção de membros:
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => setAutoScheduleOpen(true)}
  disabled={!watchedDate}
>
  <Zap className="w-3.5 h-3.5 mr-1" />
  Auto-escalar
</Button>

// Dialog:
<AutoScheduleDialog
  open={autoScheduleOpen}
  onClose={() => setAutoScheduleOpen(false)}
  serviceDate={watchedDate}
  members={membersForSchedule}
  onApply={(memberIds) => setValue('member_ids', memberIds)}
/>
```

(`watchedDate` é o valor do campo data observado via `watch('date')` do react-hook-form — adaptar conforme o nome do campo no formulário existente.)

- [ ] **Verificar:** criar novo culto → preencher data → clicar "Auto-escalar" → dialog gera sugestão com nomes e cores de confiança → "Aplicar sugestão" → membros aparecem pré-selecionados no formulário → líder pode ajustar antes de salvar.

- [ ] **Commit**
```bash
git add src/components/service/AutoScheduleDialog.tsx src/pages/ServiceCreate.tsx
git commit -m "feat: auto-schedule dialog with skill+availability+fatigue scoring"
```

---

## Checklist final de verificação

- [ ] Todas as 5 migrations aplicadas no Supabase
- [ ] `src/integrations/supabase/types.ts` regenerado após as migrations (`supabase gen types typescript --local > src/integrations/supabase/types.ts`)
- [ ] Feature A: membro confirma/recusa em MySchedule
- [ ] Feature B: tag de contexto aparece e persiste no setlist
- [ ] Feature C: "último uso" aparece em SongLibrary; drawer de histórico abre
- [ ] Feature D: seção de ensaio salva e exibe dados corretamente
- [ ] Feature E: exportação gera arquivo .txt legível e arquivo Holyrics
- [ ] Feature F: página /reports exibe gráfico e tabela com dados reais
- [ ] Feature G: solicitação de troca criada pelo membro; aprovação pelo líder atualiza a escala
- [ ] Feature H: YouTube player abre inline em músicas com URL
- [ ] Feature I: sugestão de música aprovada pelo líder adiciona ao setlist automaticamente
- [ ] Feature J: auto-schedule gera sugestão respeitando habilidades + disponibilidade + fadiga

---

## Ordem recomendada de implementação

```
Semana 1:  A (confirmação) → B (context tags) → C (histórico)
Semana 2:  D (ensaio) → E (exportação) → H (YouTube embed)
Semana 3:  F (relatórios) → G (troca de escala)
Semana 4+: I (setlist colaborativo) → J (auto-schedule)
```
