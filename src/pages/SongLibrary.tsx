import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSongs, useCreateSong, useUpdateSong, useDeleteSong, uploadSongPdf, getSongPdfSignedUrl, Song } from '@/hooks/useSongs';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Music, Youtube, FileText, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const musicalKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function SongForm({ 
  song, 
  onSubmit, 
  onClose,
  isSubmitting,
  organizationId
}: { 
  song?: Song; 
  onSubmit: (data: { title: string; key: string; youtube_url: string | null; pdf_url: string | null }) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  organizationId: string;
}) {
  const [title, setTitle] = useState(song?.title || '');
  const [key, setKey] = useState(song?.key || 'C');
  const [youtubeUrl, setYoutubeUrl] = useState(song?.youtube_url || '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let pdfUrl = song?.pdf_url || null;
    
    if (pdfFile) {
      setUploading(true);
      try {
        pdfUrl = await uploadSongPdf(pdfFile, organizationId);
      } catch (error) {
        console.error('Failed to upload PDF:', error);
      } finally {
        setUploading(false);
      }
    }

    await onSubmit({ 
      title, 
      key, 
      youtube_url: youtubeUrl || null,
      pdf_url: pdfUrl
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título da Música</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Grande é o Senhor"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="key">Tom Oficial</Label>
        <Select value={key} onValueChange={setKey}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {musicalKeys.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="youtube">Link do YouTube (opcional)</Label>
        <Input
          id="youtube"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          type="url"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pdf">Cifra em PDF (opcional)</Label>
        <Input
          id="pdf"
          type="file"
          accept=".pdf"
          className="cursor-pointer"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
        />
        {song?.pdf_url && !pdfFile && (
          <p className="text-xs text-muted-foreground">PDF já anexado</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || uploading}>
          Cancelar
        </Button>
        <Button type="submit" className="btn-primary-gradient" disabled={isSubmitting || uploading}>
          {(isSubmitting || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {song ? 'Salvar' : 'Adicionar'}
        </Button>
      </div>
    </form>
  );
}

export default function SongLibrary() {
  const { data: songs = [], isLoading } = useSongs();
  const { organization } = useOrganization();
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();
  
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | undefined>();

  const filteredSongs = songs.filter((song) =>
    song.title.toLowerCase().includes(search.toLowerCase()) ||
    song.key.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (data: { title: string; key: string; youtube_url: string | null; pdf_url: string | null }) => {
    if (editingSong) {
      await updateSong.mutateAsync({ id: editingSong.id, ...data });
    } else {
      await createSong.mutateAsync(data);
    }
    setIsOpen(false);
    setEditingSong(undefined);
  };

  const handleDelete = async (id: string) => {
    await deleteSong.mutateAsync(id);
  };

  const handleEdit = (song: Song) => {
    setEditingSong(song);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingSong(undefined);
  };

  return (
    <AppLayout title="Biblioteca de Músicas">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar músicas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setEditingSong(undefined);
        }}>
          <DialogTrigger asChild>
            <Button className="btn-primary-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Nova Música
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingSong ? 'Editar Música' : 'Adicionar Música'}
              </DialogTitle>
            </DialogHeader>
            <SongForm 
              song={editingSong} 
              onSubmit={handleSubmit}
              onClose={handleClose}
              isSubmitting={createSong.isPending || updateSong.isPending}
              organizationId={organization?.id || ''}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead className="w-20">Tom</TableHead>
                  <TableHead className="w-32">Links</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSongs.map((song, index) => (
                  <TableRow 
                    key={song.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Music className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-medium">{song.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-sm font-medium">
                        {song.key}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {song.youtube_url && (
                          <a
                            href={song.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-secondary transition-colors"
                          >
                            <Youtube className="h-4 w-4 text-destructive" />
                          </a>
                        )}
                        {song.pdf_url && (
                          <button
                            onClick={async () => {
                              const url = await getSongPdfSignedUrl(song.pdf_url!);
                              if (url) window.open(url, '_blank');
                            }}
                            className="p-2 rounded-lg hover:bg-secondary transition-colors"
                          >
                            <FileText className="h-4 w-4 text-primary" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(song)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(song.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredSongs.map((song, index) => (
              <div 
                key={song.id}
                className="card-interactive p-4 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Music className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{song.title}</h3>
                      <span className="text-sm text-muted-foreground">Tom: {song.key}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(song)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(song.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {(song.youtube_url || song.pdf_url) && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    {song.youtube_url && (
                      <a
                        href={song.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Youtube className="h-4 w-4 text-destructive" />
                        YouTube
                      </a>
                    )}
                    {song.pdf_url && (
                      <button
                        onClick={async () => {
                          const url = await getSongPdfSignedUrl(song.pdf_url!);
                          if (url) window.open(url, '_blank');
                        }}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <FileText className="h-4 w-4 text-primary" />
                        Cifra
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredSongs.length === 0 && (
            <div className="card-elevated p-12 text-center">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-lg font-medium mb-2">Nenhuma música encontrada</h3>
              <p className="text-muted-foreground">
                {search ? 'Tente uma busca diferente' : 'Adicione sua primeira música'}
              </p>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
