import { useState, useEffect } from 'react';
import { Song, getSongPdfSignedUrl } from '@/hooks/useSongs';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Youtube, FileText, Music, ExternalLink, Loader2 } from 'lucide-react';

interface SongDrawerProps {
  song: Song | null;
  open: boolean;
  onClose: () => void;
}

function getYoutubeEmbedUrl(youtubeUrl: string) {
  const videoIdMatch = youtubeUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );
  return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
}

export function SongDrawer({ song, open, onClose }: SongDrawerProps) {
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (open && song?.pdf_url) {
      setPdfLoading(true);
      getSongPdfSignedUrl(song.pdf_url)
        .then(setPdfSignedUrl)
        .finally(() => setPdfLoading(false));
    } else {
      setPdfSignedUrl(null);
    }
  }, [open, song?.pdf_url]);

  if (!song) return null;

  const hasYoutube = !!song.youtube_url;
  const hasPdf = !!song.pdf_url;
  const defaultTab = hasYoutube ? 'youtube' : 'pdf';

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DrawerTitle className="text-xl">{song.title}</DrawerTitle>
                <Badge variant="secondary" className="mt-1 text-lg font-bold px-3">
                  {song.key}
                </Badge>
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6">
          {(hasYoutube || hasPdf) ? (
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="w-full mb-4">
                {hasYoutube && (
                  <TabsTrigger value="youtube" className="flex-1 gap-2">
                    <Youtube className="h-4 w-4" />
                    Ouvir
                  </TabsTrigger>
                )}
                {hasPdf && (
                  <TabsTrigger value="pdf" className="flex-1 gap-2">
                    <FileText className="h-4 w-4" />
                    Cifra
                  </TabsTrigger>
                )}
              </TabsList>

              {hasYoutube && (
                <TabsContent value="youtube" className="mt-0">
                  <div className="aspect-video rounded-xl overflow-hidden bg-black">
                    <iframe
                      src={getYoutubeEmbedUrl(song.youtube_url!) || song.youtube_url!}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-3 gap-2"
                    onClick={() => window.open(song.youtube_url!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir no YouTube
                  </Button>
                </TabsContent>
              )}

              {hasPdf && (
                <TabsContent value="pdf" className="mt-0">
                  <div className="h-[50vh] rounded-xl overflow-hidden border bg-white flex items-center justify-center">
                    {pdfLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : pdfSignedUrl ? (
                      <iframe
                        src={pdfSignedUrl}
                        className="w-full h-full"
                        title={`Cifra - ${song.title}`}
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">Erro ao carregar o PDF.</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-3 gap-2"
                    disabled={pdfLoading || !pdfSignedUrl}
                    onClick={() => pdfSignedUrl && window.open(pdfSignedUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir em Nova Aba
                  </Button>
                </TabsContent>
              )}
            </Tabs>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum recurso disponível para esta música.</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
