-- Função para auto-criar voluntário quando membro é adicionado
CREATE OR REPLACE FUNCTION public.auto_create_volunteer_on_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_existing_volunteer UUID;
BEGIN
  -- Verificar se já existe voluntário para este user+org
  SELECT id INTO v_existing_volunteer
  FROM volunteers
  WHERE user_id = NEW.user_id 
    AND organization_id = NEW.organization_id;

  IF v_existing_volunteer IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar nome do perfil
  SELECT name INTO v_name
  FROM profiles
  WHERE user_id = NEW.user_id;

  IF v_name IS NULL THEN
    v_name := 'Novo Voluntário';
  END IF;

  -- Criar voluntário automaticamente
  INSERT INTO volunteers (user_id, organization_id, name, role, skills)
  VALUES (NEW.user_id, NEW.organization_id, v_name, 'vocalist', ARRAY[]::text[]);

  RETURN NEW;
END;
$$;

-- Trigger na tabela organization_members
DROP TRIGGER IF EXISTS trigger_auto_create_volunteer ON organization_members;
CREATE TRIGGER trigger_auto_create_volunteer
  AFTER INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_volunteer_on_membership();

-- Criar voluntários para membros existentes que ainda não têm
INSERT INTO volunteers (user_id, organization_id, name, role, skills)
SELECT 
  om.user_id,
  om.organization_id,
  COALESCE(p.name, 'Voluntário'),
  'vocalist',
  ARRAY[]::text[]
FROM organization_members om
LEFT JOIN profiles p ON p.user_id = om.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM volunteers v 
  WHERE v.user_id = om.user_id 
    AND v.organization_id = om.organization_id
);

-- Criar índice único para evitar duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteers_user_org 
ON volunteers (user_id, organization_id) 
WHERE user_id IS NOT NULL;