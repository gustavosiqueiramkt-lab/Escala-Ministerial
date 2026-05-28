-- Fix the auto_create_member_skills trigger that references removed 'is_ghost' column
CREATE OR REPLACE FUNCTION public.auto_create_member_skills()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create member_skills for new members
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO member_skills (member_id, volunteer_role, skills)
    VALUES (NEW.id, 'vocalist', '{}')
    ON CONFLICT (member_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;