-- ============================================
-- FINALIZAÇÃO DA MIGRAÇÃO: Members como entidade única
-- ============================================

-- 1. Remover constraint NOT NULL de volunteer_id nas tabelas que usam member_id
ALTER TABLE unavailability ALTER COLUMN volunteer_id DROP NOT NULL;
ALTER TABLE service_volunteers ALTER COLUMN volunteer_id DROP NOT NULL;

-- 2. Definir member_id como NOT NULL para novos registros (após migração de dados)
-- Primeiro, garantir que todos os registros tenham member_id preenchido
-- Para unavailability: Se não tem member_id mas tem volunteer_id, buscar do voluntário
UPDATE unavailability u
SET member_id = (
  SELECT om.id 
  FROM volunteers v
  JOIN organization_members om ON om.user_id = v.user_id AND om.organization_id = v.organization_id
  WHERE v.id = u.volunteer_id
  LIMIT 1
)
WHERE u.member_id IS NULL AND u.volunteer_id IS NOT NULL;

-- Para service_volunteers: Se não tem member_id mas tem volunteer_id, buscar do voluntário
UPDATE service_volunteers sv
SET member_id = (
  SELECT om.id 
  FROM volunteers v
  JOIN organization_members om ON om.user_id = v.user_id AND om.organization_id = v.organization_id
  WHERE v.id = sv.volunteer_id
  LIMIT 1
)
WHERE sv.member_id IS NULL AND sv.volunteer_id IS NOT NULL;

-- 3. Remover registros órfãos (sem volunteer_id e sem member_id)
DELETE FROM unavailability WHERE volunteer_id IS NULL AND member_id IS NULL;
DELETE FROM service_volunteers WHERE volunteer_id IS NULL AND member_id IS NULL;

-- 4. Adicionar índices para member_id para performance
CREATE INDEX IF NOT EXISTS idx_unavailability_member_id ON unavailability(member_id);
CREATE INDEX IF NOT EXISTS idx_service_volunteers_member_id ON service_volunteers(member_id);

-- 5. Desabilitar criação de novos voluntários via tabela volunteers
-- Removendo a trigger que criava voluntários automaticamente
DROP TRIGGER IF EXISTS create_volunteer_on_membership ON organization_members;

-- 6. Revogar INSERT na tabela volunteers para o papel anon e authenticated
-- Isso impede que novos voluntários sejam criados pela aplicação
REVOKE INSERT ON volunteers FROM anon;
REVOKE INSERT ON volunteers FROM authenticated;

-- 7. Comentário na tabela para indicar que está deprecated
COMMENT ON TABLE volunteers IS 'DEPRECATED: Tabela mantida apenas para compatibilidade com dados históricos. Use organization_members + member_skills para novas funcionalidades.';
