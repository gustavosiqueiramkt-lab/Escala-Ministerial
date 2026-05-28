-- Vincular voluntários existentes à organização
UPDATE volunteers 
SET organization_id = 'ffa292b2-363d-4dcd-b00b-63bf8cc224c6'
WHERE organization_id IS NULL;

-- Criar voluntário para o owner (líder pode marcar própria disponibilidade)
INSERT INTO volunteers (name, role, user_id, organization_id, skills, instrument)
VALUES 
  ('Líder Principal', 'vocalist', '27683b2e-93eb-4732-b94a-176681888a4f', 'ffa292b2-363d-4dcd-b00b-63bf8cc224c6', ARRAY['Líder de Louvor', 'Regência'], NULL),
  ('Ana Costa', 'vocalist', NULL, 'ffa292b2-363d-4dcd-b00b-63bf8cc224c6', ARRAY['Soprano', 'Backing Vocal'], NULL),
  ('Pedro Santos', 'instrumentalist', NULL, 'ffa292b2-363d-4dcd-b00b-63bf8cc224c6', ARRAY['Acordes', 'Fingerstyle'], 'Violão'),
  ('Maria Oliveira', 'instrumentalist', NULL, 'ffa292b2-363d-4dcd-b00b-63bf8cc224c6', ARRAY['Clássico', 'Contemporâneo'], 'Teclado'),
  ('João Silva', 'technician', NULL, 'ffa292b2-363d-4dcd-b00b-63bf8cc224c6', ARRAY['Mesa de Som', 'Projeção'], NULL),
  ('Lucas Ferreira', 'instrumentalist', NULL, 'ffa292b2-363d-4dcd-b00b-63bf8cc224c6', ARRAY['Rock', 'Gospel'], 'Bateria'),
  ('Carla Mendes', 'vocalist', NULL, 'ffa292b2-363d-4dcd-b00b-63bf8cc224c6', ARRAY['Contralto', 'Solo'], NULL)
ON CONFLICT DO NOTHING;