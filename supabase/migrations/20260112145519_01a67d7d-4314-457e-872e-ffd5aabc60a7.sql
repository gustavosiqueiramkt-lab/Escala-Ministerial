-- Fix 1: Restrict profiles SELECT policy to prevent email exposure
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Allow users to view profiles of members in the same organization
CREATE POLICY "Users can view org member profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.user_id
    )
  );

-- Fix 2: Correct the organizations UPDATE policy with proper table reference
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;

CREATE POLICY "Owners can update their organizations"
  ON public.organizations 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid() 
        AND organization_members.role = 'owner'
    )
  );