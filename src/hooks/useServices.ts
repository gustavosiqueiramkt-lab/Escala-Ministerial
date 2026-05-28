import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from './useOrganization';
import { z } from 'zod';

// Zod schemas for service validation
export const ServiceItemSchema = z.object({
  type: z.enum(['song', 'moment'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  song_id: z.string().uuid('ID da música inválido').optional(),
  moment_title: z.string()
    .max(100, 'Título do momento deve ter no máximo 100 caracteres')
    .optional(),
  item_order: z.number()
    .int('Ordem deve ser um número inteiro')
    .min(0, 'Ordem deve ser positiva'),
  notes: z.string()
    .max(500, 'Notas devem ter no máximo 500 caracteres')
    .optional(),
});

export const ServiceSchema = z.object({
  title: z.string()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título deve ter no máximo 200 caracteres')
    .trim(),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato: YYYY-MM-DD)'),
  time: z.string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Horário inválido (formato: HH:MM)')
    .max(10, 'Horário inválido'),
  status: z.enum(['draft', 'published'], { errorMap: () => ({ message: 'Status inválido' }) })
    .optional()
    .default('draft'),
  items: z.array(ServiceItemSchema)
    .max(50, 'Máximo de 50 itens por culto'),
  // member_ids are organization_members.id (not volunteer_ids anymore)
  member_ids: z.array(z.string().uuid('ID de membro inválido'))
    .max(100, 'Máximo de 100 membros por culto'),
});

export interface ServiceItem {
  id: string;
  service_id: string;
  type: 'song' | 'moment';
  song_id: string | null;
  moment_title: string | null;
  item_order: number;
  notes: string | null;
  created_at: string;
}

export interface ServiceVolunteer {
  id: string;
  service_id: string;
  volunteer_id: string; // Legacy - keep for backwards compatibility
  member_id: string | null; // New field
  status: 'pending' | 'confirmed' | 'declined';
  created_at: string;
}

export interface Service {
  id: string;
  title: string;
  date: string;
  time: string;
  status: 'draft' | 'published';
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  items?: ServiceItem[];
  volunteers?: ServiceVolunteer[];
}

export interface ServiceInsert {
  title: string;
  date: string;
  time: string;
  status?: 'draft' | 'published';
  items: Array<{
    type: 'song' | 'moment';
    song_id?: string;
    moment_title?: string;
    item_order: number;
    notes?: string;
  }>;
  member_ids: string[]; // organization_members.id (renamed from volunteer_ids)
}

export function useServices() {
  const { organization } = useOrganization();
  
  return useQuery({
    queryKey: ['services', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          items:service_items(*),
          volunteers:service_volunteers(*)
        `)
        .eq('organization_id', organization.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!organization?.id,
  });
}

export function useService(id: string) {
  return useQuery({
    queryKey: ['services', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          items:service_items(*),
          volunteers:service_volunteers(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Service;
    },
    enabled: !!id,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (service: ServiceInsert) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      
      // Validate input with Zod schema
      const validated = ServiceSchema.parse(service);
      
      // Create service with organization_id
      const { data: newService, error: serviceError } = await supabase
        .from('services')
        .insert({
          title: validated.title,
          date: validated.date,
          time: validated.time,
          status: validated.status,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      // Create service items
      if (validated.items.length > 0) {
        const itemsToInsert = validated.items.map((item) => ({
          service_id: newService.id,
          type: item.type,
          song_id: item.song_id || null,
          moment_title: item.moment_title || null,
          item_order: item.item_order,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase
          .from('service_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Create service members (using member_id)
      if (validated.member_ids.length > 0) {
        const membersToInsert = validated.member_ids.map((member_id) => ({
          service_id: newService.id,
          member_id,
          // Include volunteer_id as null for backwards compatibility
          volunteer_id: null as unknown as string,
        }));

        const { error: membersError } = await supabase
          .from('service_volunteers')
          .insert(membersToInsert as any);

        if (membersError) throw membersError;
      }

      return newService as Service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Culto criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar culto: ${error.message}`);
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...service }: Partial<ServiceInsert> & { id: string }) => {
      // Validate partial update with Zod schema
      const validated = ServiceSchema.partial().parse(service);
      
      // Build update object with only defined values
      const updateData: Record<string, unknown> = {};
      if (validated.title !== undefined) updateData.title = validated.title;
      if (validated.date !== undefined) updateData.date = validated.date;
      if (validated.time !== undefined) updateData.time = validated.time;
      if (validated.status !== undefined) updateData.status = validated.status;
      
      // Update service details
      const { data: updatedService, error: serviceError } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (serviceError) throw serviceError;

      // Update items if provided
      if (validated.items) {
        // Delete existing items
        await supabase.from('service_items').delete().eq('service_id', id);

        // Insert new items
        if (validated.items.length > 0) {
          const itemsToInsert = validated.items.map((item) => ({
            service_id: id,
            type: item.type,
            song_id: item.song_id || null,
            moment_title: item.moment_title || null,
            item_order: item.item_order,
            notes: item.notes || null,
          }));

          const { error: itemsError } = await supabase
            .from('service_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }

      // Update members if provided
      if (validated.member_ids) {
        // Delete existing members
        await supabase.from('service_volunteers').delete().eq('service_id', id);

        // Insert new members
        if (validated.member_ids.length > 0) {
          const membersToInsert = validated.member_ids.map((member_id) => ({
            service_id: id,
            member_id,
            // Include volunteer_id as null for backwards compatibility
            volunteer_id: null as unknown as string,
          }));

          const { error: membersError } = await supabase
            .from('service_volunteers')
            .insert(membersToInsert as any);

          if (membersError) throw membersError;
        }
      }

      return updatedService as Service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Culto atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar culto: ${error.message}`);
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Culto removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover culto: ${error.message}`);
    },
  });
}

// Hook to update a single service item's notes
export function useUpdateServiceItemNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: string; notes: string | null }) => {
      const { data, error } = await supabase
        .from('service_items')
        .update({ notes })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar nota: ${error.message}`);
    },
  });
}
