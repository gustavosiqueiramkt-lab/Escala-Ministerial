import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { MemberSelect } from '@/components/volunteers/MemberSelect';
import { useSongs, Song } from '@/hooks/useSongs';
import { useService, useCreateService, useUpdateService } from '@/hooks/useServices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Music, Clock, Trash2, Save, ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocalServiceItem {
  id: string;
  type: 'song' | 'moment';
  song_id?: string;
  moment_title?: string;
  item_order: number;
}

function SortableItem({ 
  item, 
  songs,
  onRemove 
}: { 
  item: LocalServiceItem; 
  songs: Song[];
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const song = item.type === 'song' ? songs.find((s) => s.id === item.song_id) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-border bg-card transition-all',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          item.type === 'song' ? 'bg-primary/10' : 'bg-accent/10'
        )}
      >
        {item.type === 'song' ? (
          <Music className="h-4 w-4 text-primary" />
        ) : (
          <Clock className="h-4 w-4 text-accent" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {item.type === 'song' ? song?.title : item.moment_title}
        </p>
        {item.type === 'song' && song && (
          <p className="text-xs text-muted-foreground">Tom: {song.key}</p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function ServiceCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;

  const { data: existingService } = useService(id || '');
  const { data: songs = [] } = useSongs();
  const createService = useCreateService();
  const updateService = useUpdateService();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [items, setItems] = useState<LocalServiceItem[]>([]);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [addType, setAddType] = useState<'song' | 'moment'>('song');
  const [selectedSong, setSelectedSong] = useState('');
  const [momentTitle, setMomentTitle] = useState('');

  // Load existing service data
  useEffect(() => {
    if (existingService) {
      setTitle(existingService.title);
      setDate(existingService.date);
      setTime(existingService.time);
      setItems(
        (existingService.items || [])
          .sort((a, b) => a.item_order - b.item_order)
          .map((item) => ({
            id: item.id,
            type: item.type as 'song' | 'moment',
            song_id: item.song_id || undefined,
            moment_title: item.moment_title || undefined,
            item_order: item.item_order,
          }))
      );
      // Use member_id if available, fallback to volunteer_id for legacy data
      setSelectedVolunteers(
        (existingService.volunteers || [])
          .map((v) => v.member_id || v.volunteer_id)
          .filter(Boolean)
      );
    }
  }, [existingService]);

  // Prefill date when coming from calendar click (only when creating)
  useEffect(() => {
    if (isEditing) return;
    const prefillDate = searchParams.get('date');
    if (prefillDate && !date) {
      setDate(prefillDate);
    }
  }, [date, isEditing, searchParams]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          item_order: index + 1,
        }));
      });
    }
  };

  const handleAddItem = () => {
    if (addType === 'song' && selectedSong) {
      const newItem: LocalServiceItem = {
        id: Date.now().toString(),
        type: 'song',
        song_id: selectedSong,
        item_order: items.length + 1,
      };
      setItems([...items, newItem]);
      setSelectedSong('');
    } else if (addType === 'moment' && momentTitle) {
      const newItem: LocalServiceItem = {
        id: Date.now().toString(),
        type: 'moment',
        moment_title: momentTitle,
        item_order: items.length + 1,
      };
      setItems([...items, newItem]);
      setMomentTitle('');
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleToggleVolunteer = (id: string) => {
    setSelectedVolunteers((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    const serviceData = {
      title,
      date,
      time,
      items: items.map((item) => ({
        type: item.type,
        song_id: item.song_id,
        moment_title: item.moment_title,
        item_order: item.item_order,
      })),
      member_ids: selectedVolunteers, // Now using member_ids (organization_members.id)
    };

    if (isEditing && id) {
      await updateService.mutateAsync({ id, ...serviceData });
    } else {
      await createService.mutateAsync(serviceData);
    }
    navigate('/services');
  };

  const serviceDate = date ? new Date(date) : new Date();
  const isSaving = createService.isPending || updateService.isPending;

  return (
    <AppLayout title={isEditing ? 'Editar Culto' : 'Criar Culto'}>
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Service Details */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="card-elevated p-6 animate-slide-up">
            <h2 className="font-display text-xl font-semibold mb-4">Informações</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Culto</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Culto de Celebração"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Horário</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Service Items */}
          <div className="card-elevated p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h2 className="font-display text-xl font-semibold mb-4">Liturgia</h2>

            {/* Add Item Form */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4 p-4 bg-secondary/50 rounded-lg">
              <Select value={addType} onValueChange={(v) => setAddType(v as 'song' | 'moment')}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="song">Música</SelectItem>
                  <SelectItem value="moment">Momento</SelectItem>
                </SelectContent>
              </Select>

              {addType === 'song' ? (
                <Select value={selectedSong} onValueChange={setSelectedSong}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma música" />
                  </SelectTrigger>
                  <SelectContent>
                    {songs.map((song) => (
                      <SelectItem key={song.id} value={song.id}>
                        {song.title} ({song.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={momentTitle}
                  onChange={(e) => setMomentTitle(e.target.value)}
                  placeholder="Ex: Oração, Avisos, Oferta"
                  className="flex-1"
                />
              )}

              <Button
                type="button"
                onClick={handleAddItem}
                disabled={addType === 'song' ? !selectedSong : !momentTitle}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Items List */}
            {items.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {items.map((item) => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        songs={songs}
                        onRemove={() => handleRemoveItem(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Adicione músicas e momentos à liturgia</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Volunteers */}
        <div className="card-elevated p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="font-display text-xl font-semibold mb-4">Escala de Membros</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Selecione os membros para este culto. Alertas serão exibidos para indisponibilidades
            e escalas consecutivas.
          </p>
          <MemberSelect
            selectedIds={selectedVolunteers}
            onToggle={handleToggleVolunteer}
            serviceDate={serviceDate}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 lg:relative lg:mt-6 p-4 bg-background/80 backdrop-blur-sm border-t border-border lg:border-0 lg:bg-transparent lg:p-0">
        <div className="flex gap-3 max-w-screen-lg mx-auto lg:justify-end">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1 lg:flex-none" disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="btn-primary-gradient flex-1 lg:flex-none" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? 'Salvar Alterações' : 'Salvar Culto'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
