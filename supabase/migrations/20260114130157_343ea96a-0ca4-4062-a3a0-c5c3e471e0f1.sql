-- 1. Create helper function to get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_organization_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = _user_id
$$;

-- 2. Create helper function to check if user is admin/owner in an org
CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('owner', 'admin')
  )
$$;

-- 3. Create RPC function to create organization with owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  org_name text,
  org_slug text,
  org_logo_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Create the organization
  INSERT INTO public.organizations (name, slug, logo_url)
  VALUES (org_name, org_slug, org_logo_url)
  RETURNING id INTO new_org_id;

  -- Add the creator as owner (this bypasses RLS since we're in SECURITY DEFINER)
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, current_user_id, 'owner');

  RETURN new_org_id;
END;
$$;

-- 4. Drop old trigger that was causing issues (we now use the RPC)
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;

-- 5. Update VOLUNTEERS RLS policies for multi-tenancy
DROP POLICY IF EXISTS "Authenticated users can view volunteers" ON public.volunteers;
DROP POLICY IF EXISTS "Authenticated users can insert volunteers" ON public.volunteers;
DROP POLICY IF EXISTS "Authenticated users can update volunteers" ON public.volunteers;
DROP POLICY IF EXISTS "Authenticated users can delete volunteers" ON public.volunteers;

CREATE POLICY "Members can view org volunteers"
ON public.volunteers FOR SELECT
USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "Admins/owners can insert volunteers"
ON public.volunteers FOR INSERT
WITH CHECK (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  AND public.is_org_admin_or_owner(auth.uid(), organization_id)
);

CREATE POLICY "Admins/owners can update volunteers"
ON public.volunteers FOR UPDATE
USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  AND public.is_org_admin_or_owner(auth.uid(), organization_id)
);

CREATE POLICY "Admins/owners can delete volunteers"
ON public.volunteers FOR DELETE
USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  AND public.is_org_admin_or_owner(auth.uid(), organization_id)
);

-- 6. Update SONGS RLS policies for multi-tenancy
DROP POLICY IF EXISTS "Authenticated users can view songs" ON public.songs;
DROP POLICY IF EXISTS "Authenticated users can insert songs" ON public.songs;
DROP POLICY IF EXISTS "Authenticated users can update songs" ON public.songs;
DROP POLICY IF EXISTS "Authenticated users can delete songs" ON public.songs;

CREATE POLICY "Members can view org songs"
ON public.songs FOR SELECT
USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "Admins/owners can insert songs"
ON public.songs FOR INSERT
WITH CHECK (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  AND public.is_org_admin_or_owner(auth.uid(), organization_id)
);

CREATE POLICY "Admins/owners can update songs"
ON public.songs FOR UPDATE
USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  AND public.is_org_admin_or_owner(auth.uid(), organization_id)
);

CREATE POLICY "Admins/owners can delete songs"
ON public.songs FOR DELETE
USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  AND public.is_org_admin_or_owner(auth.uid(), organization_id)
);

-- 7. Update SERVICES RLS policies for multi-tenancy
DROP POLICY IF EXISTS "Authenticated users can view services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can insert services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can update services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can delete services" ON public.services;

CREATE POLICY "Members can view org services"
ON public.services FOR SELECT
USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "Admins/owners can insert services"
ON public.services FOR INSERT
WITH CHECK (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  AND public.is_org_admin_or_owner(auth.uid(), organization_id)
);

CREATE POLICY "Admins/owners can update services"
ON public.services FOR UPDATE
USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  AND public.is_org_admin_or_owner(auth.uid(), organization_id)
);

CREATE POLICY "Admins/owners can delete services"
ON public.services FOR DELETE
USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  AND public.is_org_admin_or_owner(auth.uid(), organization_id)
);

-- 8. Update SERVICE_ITEMS RLS (linked to services)
DROP POLICY IF EXISTS "Authenticated users can view service items" ON public.service_items;
DROP POLICY IF EXISTS "Authenticated users can insert service items" ON public.service_items;
DROP POLICY IF EXISTS "Authenticated users can update service items" ON public.service_items;
DROP POLICY IF EXISTS "Authenticated users can delete service items" ON public.service_items;

CREATE POLICY "Members can view service items"
ON public.service_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_items.service_id
    AND s.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

CREATE POLICY "Admins/owners can insert service items"
ON public.service_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_items.service_id
    AND public.is_org_admin_or_owner(auth.uid(), s.organization_id)
  )
);

CREATE POLICY "Admins/owners can update service items"
ON public.service_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_items.service_id
    AND public.is_org_admin_or_owner(auth.uid(), s.organization_id)
  )
);

CREATE POLICY "Admins/owners can delete service items"
ON public.service_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_items.service_id
    AND public.is_org_admin_or_owner(auth.uid(), s.organization_id)
  )
);

-- 9. Update SERVICE_VOLUNTEERS RLS (linked to services)
DROP POLICY IF EXISTS "Authenticated users can view service volunteers" ON public.service_volunteers;
DROP POLICY IF EXISTS "Authenticated users can insert service volunteers" ON public.service_volunteers;
DROP POLICY IF EXISTS "Authenticated users can update service volunteers" ON public.service_volunteers;
DROP POLICY IF EXISTS "Authenticated users can delete service volunteers" ON public.service_volunteers;

CREATE POLICY "Members can view service volunteers"
ON public.service_volunteers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_volunteers.service_id
    AND s.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

CREATE POLICY "Admins/owners can insert service volunteers"
ON public.service_volunteers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_volunteers.service_id
    AND public.is_org_admin_or_owner(auth.uid(), s.organization_id)
  )
);

CREATE POLICY "Admins/owners can update service volunteers"
ON public.service_volunteers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_volunteers.service_id
    AND public.is_org_admin_or_owner(auth.uid(), s.organization_id)
  )
);

CREATE POLICY "Admins/owners can delete service volunteers"
ON public.service_volunteers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_volunteers.service_id
    AND public.is_org_admin_or_owner(auth.uid(), s.organization_id)
  )
);

-- 10. Update UNAVAILABILITY RLS (linked to volunteers)
DROP POLICY IF EXISTS "Authenticated users can view unavailability" ON public.unavailability;
DROP POLICY IF EXISTS "Authenticated users can insert unavailability" ON public.unavailability;
DROP POLICY IF EXISTS "Authenticated users can update unavailability" ON public.unavailability;
DROP POLICY IF EXISTS "Authenticated users can delete unavailability" ON public.unavailability;

CREATE POLICY "Members can view unavailability"
ON public.unavailability FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.volunteers v
    WHERE v.id = unavailability.volunteer_id
    AND v.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

CREATE POLICY "Members can insert own unavailability"
ON public.unavailability FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.volunteers v
    WHERE v.id = unavailability.volunteer_id
    AND v.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

CREATE POLICY "Members can update own unavailability"
ON public.unavailability FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.volunteers v
    WHERE v.id = unavailability.volunteer_id
    AND v.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

CREATE POLICY "Members can delete own unavailability"
ON public.unavailability FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.volunteers v
    WHERE v.id = unavailability.volunteer_id
    AND v.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

-- 11. Make song-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'song-files';

-- 12. Update storage policies for private bucket
DROP POLICY IF EXISTS "Authenticated users can upload song files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view song files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete song files" ON storage.objects;

CREATE POLICY "Org members can upload song files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'song-files'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Org members can view song files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'song-files'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Org members can delete song files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'song-files'
  AND auth.role() = 'authenticated'
);