-- =====================================================
-- UNIFICAÇÃO MEMBROS/VOLUNTÁRIOS: member_skills + ghost members
-- =====================================================

-- 0. PRIMEIRO: Tornar user_id nullable para permitir ghost members
ALTER TABLE public.organization_members ALTER COLUMN user_id DROP NOT NULL;

-- 1. Nova tabela para habilidades dos membros
CREATE TABLE public.member_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  volunteer_role public.volunteer_role NOT NULL DEFAULT 'vocalist',
  instrument TEXT,
  skills TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ, -- NULL = onboarding pendente
  UNIQUE(member_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.member_skills ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
CREATE POLICY "Members can view org skills"
ON public.member_skills FOR SELECT
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = member_skills.member_id
    AND om.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
));

CREATE POLICY "Members can update own skills"
ON public.member_skills FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = member_skills.member_id
    AND om.user_id = auth.uid()
));

CREATE POLICY "Admins can update any skills"
ON public.member_skills FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = member_skills.member_id
    AND is_org_admin_or_owner(auth.uid(), om.organization_id)
));

CREATE POLICY "System can insert skills"
ON public.member_skills FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = member_skills.member_id
    AND (om.user_id = auth.uid() OR is_org_admin_or_owner(auth.uid(), om.organization_id))
));

CREATE POLICY "Admins can delete skills"
ON public.member_skills FOR DELETE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = member_skills.member_id
    AND is_org_admin_or_owner(auth.uid(), om.organization_id)
));

-- 4. Trigger para updated_at
CREATE TRIGGER update_member_skills_updated_at
BEFORE UPDATE ON public.member_skills
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Adicionar colunas para membros fantasma (voluntários manuais)
ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS is_ghost BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ghost_name TEXT,
ADD COLUMN IF NOT EXISTS ghost_avatar_url TEXT;

-- 6. Migrar voluntários COM user_id (criar member_skills)
INSERT INTO member_skills (member_id, volunteer_role, instrument, skills, completed_at)
SELECT om.id, v.role, v.instrument, COALESCE(v.skills, '{}'), now()
FROM volunteers v
JOIN organization_members om ON om.user_id = v.user_id AND om.organization_id = v.organization_id
WHERE v.user_id IS NOT NULL
ON CONFLICT (member_id) DO UPDATE SET
  volunteer_role = EXCLUDED.volunteer_role,
  instrument = EXCLUDED.instrument,
  skills = EXCLUDED.skills,
  completed_at = EXCLUDED.completed_at;

-- 7. Migrar voluntários SEM user_id como "ghost members"
INSERT INTO organization_members (organization_id, user_id, role, is_ghost, ghost_name, ghost_avatar_url)
SELECT 
  v.organization_id,
  NULL,
  'member',
  true,
  v.name,
  v.avatar_url
FROM volunteers v
WHERE v.user_id IS NULL;

-- 8. Criar member_skills para ghost members recém-criados
INSERT INTO member_skills (member_id, volunteer_role, instrument, skills, completed_at)
SELECT om.id, v.role, v.instrument, COALESCE(v.skills, '{}'), now()
FROM volunteers v
JOIN organization_members om ON om.ghost_name = v.name 
  AND om.organization_id = v.organization_id 
  AND om.is_ghost = true
WHERE v.user_id IS NULL
ON CONFLICT (member_id) DO NOTHING;

-- 9. Adicionar coluna member_id às tabelas dependentes
ALTER TABLE service_volunteers ADD COLUMN IF NOT EXISTS member_id UUID;
ALTER TABLE unavailability ADD COLUMN IF NOT EXISTS member_id UUID;

-- 10. Migrar service_volunteers
UPDATE service_volunteers sv
SET member_id = om.id
FROM volunteers v
JOIN organization_members om ON (
  (v.user_id IS NOT NULL AND om.user_id = v.user_id AND om.organization_id = v.organization_id AND om.is_ghost = false)
  OR (v.user_id IS NULL AND om.is_ghost = true AND om.ghost_name = v.name AND om.organization_id = v.organization_id)
)
WHERE sv.volunteer_id = v.id AND sv.member_id IS NULL;

-- 11. Migrar unavailability
UPDATE unavailability u
SET member_id = om.id
FROM volunteers v
JOIN organization_members om ON (
  (v.user_id IS NOT NULL AND om.user_id = v.user_id AND om.organization_id = v.organization_id AND om.is_ghost = false)
  OR (v.user_id IS NULL AND om.is_ghost = true AND om.ghost_name = v.name AND om.organization_id = v.organization_id)
)
WHERE u.volunteer_id = v.id AND u.member_id IS NULL;

-- 12. Atualizar trigger para criar member_skills (substituir o antigo)
CREATE OR REPLACE FUNCTION public.auto_create_member_skills()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar member_skills para novos membros (não ghost)
  IF NEW.is_ghost = false AND NEW.user_id IS NOT NULL THEN
    INSERT INTO member_skills (member_id, volunteer_role, skills)
    VALUES (NEW.id, 'vocalist', '{}')
    ON CONFLICT (member_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 13. Remover trigger antigo e criar novo
DROP TRIGGER IF EXISTS trigger_auto_create_volunteer ON organization_members;
DROP TRIGGER IF EXISTS trigger_auto_create_member_skills ON organization_members;

CREATE TRIGGER trigger_auto_create_member_skills
  AFTER INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_member_skills();

-- 14. Criar member_skills para membros existentes que ainda não têm
INSERT INTO member_skills (member_id, volunteer_role, skills)
SELECT om.id, 'vocalist', '{}'
FROM organization_members om
WHERE om.is_ghost = false 
  AND om.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM member_skills ms WHERE ms.member_id = om.id);

-- 15. Adicionar FK para member_id (sem DROP da coluna antiga ainda)
ALTER TABLE service_volunteers 
  ADD CONSTRAINT service_volunteers_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES organization_members(id) ON DELETE CASCADE;

ALTER TABLE unavailability 
  ADD CONSTRAINT unavailability_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES organization_members(id) ON DELETE CASCADE;

-- 16. Atualizar RLS para service_volunteers usando member_id
CREATE POLICY "Volunteers can update own status via member_id"
ON service_volunteers FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = service_volunteers.member_id
    AND om.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = service_volunteers.member_id
    AND om.user_id = auth.uid()
));

-- 17. Atualizar RLS para unavailability usando member_id
CREATE POLICY "Members can view unavailability via member_id"
ON unavailability FOR SELECT
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = unavailability.member_id
    AND om.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
));

CREATE POLICY "Members can insert unavailability via member_id"
ON unavailability FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = unavailability.member_id
    AND (om.user_id = auth.uid() OR is_org_admin_or_owner(auth.uid(), om.organization_id))
));

CREATE POLICY "Members can update unavailability via member_id"
ON unavailability FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = unavailability.member_id
    AND (om.user_id = auth.uid() OR is_org_admin_or_owner(auth.uid(), om.organization_id))
));

CREATE POLICY "Members can delete unavailability via member_id"
ON unavailability FOR DELETE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = unavailability.member_id
    AND (om.user_id = auth.uid() OR is_org_admin_or_owner(auth.uid(), om.organization_id))
));