-- 1. Delete all ghost members and their skills
DELETE FROM member_skills 
WHERE member_id IN (SELECT id FROM organization_members WHERE is_ghost = true);

DELETE FROM service_volunteers 
WHERE member_id IN (SELECT id FROM organization_members WHERE is_ghost = true);

DELETE FROM unavailability 
WHERE member_id IN (SELECT id FROM organization_members WHERE is_ghost = true);

DELETE FROM organization_members WHERE is_ghost = true;

-- 2. Remove ghost-related columns from organization_members
ALTER TABLE organization_members 
DROP COLUMN IF EXISTS is_ghost,
DROP COLUMN IF EXISTS ghost_name,
DROP COLUMN IF EXISTS ghost_avatar_url;

-- 3. Make user_id NOT NULL again (no more ghost members)
ALTER TABLE organization_members 
ALTER COLUMN user_id SET NOT NULL;

-- 4. Drop the legacy volunteers table completely
DROP TABLE IF EXISTS volunteers CASCADE;

-- 5. Clean up old volunteer_id columns (keep only member_id)
ALTER TABLE service_volunteers DROP COLUMN IF EXISTS volunteer_id;
ALTER TABLE unavailability DROP COLUMN IF EXISTS volunteer_id;