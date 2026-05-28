import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from './useOrganization';
import { z } from 'zod';

// Zod schema for song validation
const youtubeUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

export const SongSchema = z.object({
  title: z.string()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título deve ter no máximo 200 caracteres')
    .trim(),
  key: z.string()
    .min(1, 'Tom é obrigatório')
    .max(10, 'Tom deve ter no máximo 10 caracteres'),
  youtube_url: z.string()
    .max(500, 'URL deve ter no máximo 500 caracteres')
    .refine((val) => !val || youtubeUrlPattern.test(val), 'URL do YouTube inválida')
    .nullable()
    .optional()
    .transform(val => val || null),
  pdf_url: z.string()
    .max(2000, 'URL deve ter no máximo 2000 caracteres')
    .refine((val) => !val || /^(https?:\/\/|pdfs\/)/.test(val), 'URL do PDF inválida')
    .nullable()
    .optional()
    .transform(val => val || null),
});

export type SongInsertInput = z.infer<typeof SongSchema>;

export interface Song {
  id: string;
  title: string;
  key: string;
  youtube_url: string | null;
  pdf_url: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export type SongInsert = Omit<Song, 'id' | 'created_at' | 'updated_at' | 'organization_id'>;
export type SongUpdate = Partial<SongInsert>;

export function useSongs() {
  const { organization } = useOrganization();
  
  return useQuery({
    queryKey: ['songs', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Song[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateSong() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (song: SongInsert) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      
      // Validate input with Zod schema
      const validated = SongSchema.parse(song);
      
      const { data, error } = await supabase
        .from('songs')
        .insert({
          title: validated.title,
          key: validated.key,
          youtube_url: validated.youtube_url,
          pdf_url: validated.pdf_url,
          organization_id: organization.id
        })
        .select()
        .single();

      if (error) throw error;
      return data as Song;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success('Música adicionada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar música: ${error.message}`);
    },
  });
}

export function useUpdateSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...song }: SongUpdate & { id: string }) => {
      // Validate partial update with Zod schema
      const validated = SongSchema.partial().parse(song);
      
      // Build update object with only defined values
      const updateData: Record<string, unknown> = {};
      if (validated.title !== undefined) updateData.title = validated.title;
      if (validated.key !== undefined) updateData.key = validated.key;
      if (validated.youtube_url !== undefined) updateData.youtube_url = validated.youtube_url;
      if (validated.pdf_url !== undefined) updateData.pdf_url = validated.pdf_url;
      
      const { data, error } = await supabase
        .from('songs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Song;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success('Música atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar música: ${error.message}`);
    },
  });
}

export function useDeleteSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success('Música removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover música: ${error.message}`);
    },
  });
}

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Upload a song PDF file to storage with organization-scoped path
 * @param file - The PDF file to upload
 * @param organizationId - The organization ID for path scoping
 * @returns The file path for storage in database
 */
export async function uploadSongPdf(file: File, organizationId: string): Promise<string> {
  // Validate organization ID
  if (!organizationId) {
    throw new Error('Organização não encontrada');
  }

  // Validate file type (MIME type checking)
  if (file.type !== 'application/pdf') {
    throw new Error('Apenas arquivos PDF são permitidos');
  }

  // Validate file size
  if (file.size > MAX_PDF_SIZE) {
    throw new Error('O arquivo deve ter menos de 10MB');
  }

  // Force .pdf extension regardless of user input
  // File path includes organization ID for RLS policy enforcement
  const fileName = `${Date.now()}.pdf`;
  const filePath = `pdfs/${organizationId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('song-files')
    .upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: false
    });

  if (uploadError) throw uploadError;

  // Return the file path for storage, the UI should regenerate signed URLs on-demand
  return filePath;
}

/**
 * Get a signed URL for a song PDF file
 * Use this to generate fresh signed URLs on-demand instead of storing long-lived URLs
 * @param filePath - The file path stored in the database (e.g., "pdfs/1234567890.pdf")
 * @returns A signed URL valid for 1 hour
 */
export async function getSongPdfSignedUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null;
  
  // If it's already a full URL (legacy data with old signed URLs), try to extract the path
  // or return as-is for backwards compatibility
  if (filePath.startsWith('http')) {
    // Legacy URL - check if it's a signed URL we can use
    // For backwards compatibility, return as-is but this may expire
    return filePath;
  }
  
  const { data, error } = await supabase.storage
    .from('song-files')
    .createSignedUrl(filePath, 60 * 60); // 1 hour validity
    
  if (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
  
  return data.signedUrl;
}
