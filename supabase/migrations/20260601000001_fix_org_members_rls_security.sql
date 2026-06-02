-- SECURITY FIX: Remove self-join vulnerability in organization_members INSERT policy.
-- The old policy allowed any authenticated user to add themselves to any organization
-- by satisfying the "auth.uid() = user_id" condition alone.
-- Only owners/admins should be able to add members. Invite flows use SECURITY DEFINER
-- functions (check_and_process_my_invites, process_pending_invites) that bypass RLS.

DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.organization_members;

CREATE POLICY "Owners and admins can manage members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

-- CLEANUP: Drop the broken UPDATE policy on service_volunteers that references
-- the 'volunteers' table dropped in migration 20260206133032. At runtime this
-- policy causes an "relation does not exist" error when a volunteer tries to
-- confirm/decline their assignment. The replacement policy using member_id was
-- already added in migration 20260204212425.

DROP POLICY IF EXISTS "Volunteers can update own assignment status" ON public.service_volunteers;
