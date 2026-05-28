-- Create pending_invites table for inviting users who haven't signed up yet
CREATE TABLE public.pending_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'member',
    invited_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT pending_invites_email_org_unique UNIQUE (email, organization_id)
);

-- Enable RLS
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

-- Admins/owners can view pending invites for their org
CREATE POLICY "Admins/owners can view pending invites"
ON public.pending_invites
FOR SELECT
USING (is_org_admin_or_owner(auth.uid(), organization_id));

-- Admins/owners can create pending invites
CREATE POLICY "Admins/owners can create pending invites"
ON public.pending_invites
FOR INSERT
WITH CHECK (is_org_admin_or_owner(auth.uid(), organization_id));

-- Admins/owners can delete pending invites
CREATE POLICY "Admins/owners can delete pending invites"
ON public.pending_invites
FOR DELETE
USING (is_org_admin_or_owner(auth.uid(), organization_id));

-- Function to process pending invites on user signup/login
CREATE OR REPLACE FUNCTION public.process_pending_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invite RECORD;
BEGIN
    -- Find all pending invites for this user's email
    FOR invite IN
        SELECT * FROM public.pending_invites
        WHERE LOWER(email) = LOWER(NEW.email)
    LOOP
        -- Check if not already a member
        IF NOT EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE user_id = NEW.id AND organization_id = invite.organization_id
        ) THEN
            -- Add user to organization
            INSERT INTO public.organization_members (organization_id, user_id, role)
            VALUES (invite.organization_id, NEW.id, invite.role);
        END IF;
        
        -- Delete the processed invite
        DELETE FROM public.pending_invites WHERE id = invite.id;
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new signups - using AFTER trigger
CREATE TRIGGER on_auth_user_created_process_invites
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.process_pending_invites();

-- Also create a function to manually check invites (for existing users logging in)
CREATE OR REPLACE FUNCTION public.check_and_process_my_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    current_user_email text;
    invite RECORD;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get user email from profiles
    SELECT email INTO current_user_email
    FROM public.profiles
    WHERE user_id = current_user_id;
    
    IF current_user_email IS NULL THEN
        RETURN;
    END IF;
    
    -- Process invites
    FOR invite IN
        SELECT * FROM public.pending_invites
        WHERE LOWER(email) = LOWER(current_user_email)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE user_id = current_user_id AND organization_id = invite.organization_id
        ) THEN
            INSERT INTO public.organization_members (organization_id, user_id, role)
            VALUES (invite.organization_id, current_user_id, invite.role);
        END IF;
        
        DELETE FROM public.pending_invites WHERE id = invite.id;
    END LOOP;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_and_process_my_invites() TO authenticated;