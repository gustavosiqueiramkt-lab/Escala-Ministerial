-- Add UPDATE policy for organization_members so owners/admins can change roles
CREATE POLICY "Owners and admins can update members"
ON public.organization_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

-- Fix the organization SELECT policy (it was referencing wrong column)
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

CREATE POLICY "Users can view their organizations"
ON public.organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
  )
);