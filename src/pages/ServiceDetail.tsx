import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useService, useUpdateServiceItemNotes, useDeleteService, useDuplicateService } from '@/hooks/useServices';
import { useSongs, Song } from '@/hooks/useSongs';
import { useOrganizationMembersWithSkills } from '@/hooks/useMemberSkills';
import { useOrgRole } from '@/hooks/useOrgRole';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { SongDrawer } from '@/components/service/SongDrawer';
import { TeamSection } from '@/components/service/TeamSection';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft,
  Calendar,
  Clock,
  Music,
  Users,
  Pencil,
  ChevronRight,
  MessageSquare,
  Save,
  Loader2,
  MoreVertical,
  Copy,
  Trash2,
} from 'lucide-react';
import { format, isToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Mobile-first setlist card
interface SetlistCardProps {
  item: {
    id: string;
    type: string;
    song_id: string | null;
    moment_title: string | null;
    item_order: number;
    notes: string | null;
  };
  song: Song | undefined;
  index: number;
  isLeader: boolean;
  onClick: () => void;
  onEditNotes: () => void;
}

function SetlistCard({ item, song, index, isLeader, onClick, onEditNotes }: SetlistCardProps) {
  const isSong = item.type === 'song' && song;
  const hasNotes = !!item.notes;

  return (
    <div className="space-y-1">
      <button
        onClick={onClick}
        disabled={!isSong}
        className={cn(
          'w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]',
          isSong
            ? 'bg-gradient-to-r from-primary/5 to-transparent border-primary/20 hover:border-primary/40 hover:shadow-md cursor-pointer'
            : 'bg-secondary/30 border-border cursor-default'
        )}
      >
        {/* Order Number */}
        <span className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-sm',
          isSong ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}>
          {index + 1}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-semibold truncate',
            isSong ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {isSong ? song.title : item.moment_title}
          </p>
          {!isSong && (
            <p className="text-xs text-muted-foreground mt-0.5">Momento</p>
          )}
        </div>

        {/* Key Badge (for songs) */}
        {isSong && (
          <Badge 
            variant="secondary" 
            className="shrink-0 text-lg font-bold px-3 py-1 bg-primary/10 text-primary border-0"
          >
            {song.key}
          </Badge>
        )}

        {/* Notes indicator */}
        {hasNotes && (
          <MessageSquare className="h-4 w-4 text-amber-500 shrink-0" />
        )}

        {/* Arrow for songs */}
        {isSong && (
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Notes Display */}
      {hasNotes && (
        <div 
          className={cn(
            'ml-11 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
            isLeader && 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30'
          )}
          onClick={isLeader ? onEditNotes : undefined}
        >
          <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{item.notes}</span>
          </p>
        </div>
      )}

      {/* Add notes button for leaders */}
      {isLeader && !hasNotes && (
        <button
          onClick={onEditNotes}
          className="ml-11 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 py-1"
        >
          <MessageSquare className="h-3 w-3" />
          Adicionar nota
        </button>
      )}
    </div>
  );
}

export default function ServiceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: service, isLoading: serviceLoading } = useService(id || '');
  const { data: songs = [] } = useSongs();
  const { data: members = [] } = useOrganizationMembersWithSkills();
  const { isLeader } = useOrgRole();
  const updateNotes = useUpdateServiceItemNotes();
  const deleteService = useDeleteService();
  const duplicateService = useDuplicateService();

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Notes editing state
  const [notesDialog, setNotesDialog] = useState<{
    open: boolean;
    itemId: string;
    currentNotes: string;
    itemTitle: string;
  }>({
    open: false,
    itemId: '',
    currentNotes: '',
    itemTitle: '',
  });

  // Delete dialog
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Duplicate dialog with date picker
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateDate, setDuplicateDate] = useState(
    service ? format(addDays(parseDateString(service.date), 7), 'yyyy-MM-dd') : ''
  );

  const handleSongClick = (song: Song) => {
    setSelectedSong(song);
    setDrawerOpen(true);
  };

  const handleEditNotes = (item: { id: string; notes: string | null; moment_title?: string | null }, song?: Song) => {
    setNotesDialog({
      open: true,
      itemId: item.id,
      currentNotes: item.notes || '',
      itemTitle: song?.title || item.moment_title || 'Item',
    });
  };

  const handleSaveNotes = () => {
    updateNotes.mutate({
      itemId: notesDialog.itemId,
      notes: notesDialog.currentNotes.trim() || null,
    }, {
      onSuccess: () => {
        setNotesDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  if (serviceLoading || !service) {
    return (
      <AppLayout title="Detalhes do Culto">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppLayout>
    );
  }

  const sortedItems = [...(service.items || [])].sort((a, b) => a.item_order - b.item_order);
  const serviceDate = parseDateString(service.date);
  const isServiceToday = isToday(serviceDate);

  return (
    <AppLayout title="Detalhes do Culto">
      {/* Mobile Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/services')}
        className="mb-4 -ml-2"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Voltar
      </Button>

      {/* Header - Mobile First */}
      <div className={cn(
        'card-elevated p-4 sm:p-6 mb-6',
        isServiceToday && 'ring-2 ring-primary shadow-lg shadow-primary/20'
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant={service.status === 'published' ? 'default' : 'secondary'}>
                {service.status === 'published' ? 'Publicado' : 'Rascunho'}
              </Badge>
              {isServiceToday && (
                <Badge className="bg-green-500 text-white animate-pulse">
                  🎯 Hoje
                </Badge>
              )}
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold truncate">
              {service.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className="capitalize">
                  {format(serviceDate, "EEE, d 'de' MMM", { locale: ptBR })}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {service.time}
              </span>
            </div>
          </div>

          {/* Action menu - only for leaders */}
          {isLeader && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className={cn(isServiceToday && 'hidden sm:flex')}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/services/${id}/edit`)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  <span>Editar</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDuplicateDialogOpen(true)}>
                  <Copy className="h-4 w-4 mr-2" />
                  <span>Duplicar</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteAlertOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Excluir culto</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Content - Mobile First Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Setlist - Primary Focus on Mobile */}
        <div className="lg:col-span-2 order-1">
          <div className="card-elevated p-4 sm:p-6">
            <h2 className="font-display text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Setlist
              <Badge variant="outline" className="ml-auto">
                {sortedItems.filter(i => i.type === 'song').length} músicas
              </Badge>
            </h2>

            <div className="space-y-3">
              {sortedItems.map((item, index) => {
                const song = item.type === 'song' ? songs.find(s => s.id === item.song_id) : undefined;
                return (
                  <SetlistCard
                    key={item.id}
                    item={item}
                    song={song}
                    index={index}
                    isLeader={isLeader}
                    onClick={() => song && handleSongClick(song)}
                    onEditNotes={() => handleEditNotes(item, song)}
                  />
                );
              })}

              {sortedItems.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Music className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Nenhum item na liturgia</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team Section - Below Setlist on Mobile */}
        <div className="order-2 lg:order-2">
          <div className="card-elevated p-4 sm:p-6 lg:sticky lg:top-6">
            <h2 className="font-display text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Equipe do Dia
              <Badge variant="outline" className="ml-auto">
                {(service.volunteers || []).filter(v => v.status === 'confirmed').length} confirmados
              </Badge>
            </h2>

            <TeamSection 
              serviceVolunteers={service.volunteers || []}
              members={members}
            />

            {/* Manage button for leaders */}
            {isLeader && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate(`/services/${id}/edit`)}
              >
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Escala
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Song Drawer (Mobile-First) */}
      <SongDrawer
        song={selectedSong}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedSong(null);
        }}
      />

      {/* Notes Edit Dialog */}
      <Dialog open={notesDialog.open} onOpenChange={(open) => setNotesDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-500" />
              Notas de Execução
            </DialogTitle>
            <DialogDescription>
              {notesDialog.itemTitle}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Ex: Começar suave no piano, Oração após 2ª estrofe..."
            value={notesDialog.currentNotes}
            onChange={(e) => setNotesDialog(prev => ({ ...prev, currentNotes: e.target.value }))}
            className="min-h-[120px]"
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setNotesDialog(prev => ({ ...prev, open: false }))}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={updateNotes.isPending}
              className="gap-2"
            >
              {updateNotes.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      {service && (
        <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicar culto</DialogTitle>
              <DialogDescription>
                Escolha a data do novo culto. Equipe e liturgia serão copiadas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Data do novo culto</label>
                <input
                  type="date"
                  value={duplicateDate}
                  onChange={(e) => setDuplicateDate(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-input rounded-md text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsDuplicateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  duplicateService.mutate({ sourceId: service.id, newDate: duplicateDate });
                  setIsDuplicateDialogOpen(false);
                }}
                disabled={duplicateService.isPending}
                className="gap-2"
              >
                {duplicateService.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Duplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir culto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este culto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              deleteService.mutate(id || '');
              setIsDeleteAlertOpen(false);
              setTimeout(() => navigate('/services'), 100);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteService.isPending}
          >
            {deleteService.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
