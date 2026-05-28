-- Fix 1: Allow volunteers to update their own assignment status
CREATE POLICY "Volunteers can update own assignment status"
ON public.service_volunteers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM volunteers v
    WHERE v.id = service_volunteers.volunteer_id
    AND v.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM volunteers v
    WHERE v.id = service_volunteers.volunteer_id
    AND v.user_id = auth.uid()
  )
);

-- Fix 2: Update storage policies to be organization-scoped
-- First drop the existing overly-permissive policies
DROP POLICY IF EXISTS "Org members can upload song files" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view song files" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete song files" ON storage.objects;

-- Create new organization-scoped storage policies
-- Files are stored as: pdfs/{organization_id}/{timestamp}.pdf
CREATE POLICY "Org members can upload song files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'song-files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can view song files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'song-files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can delete song files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'song-files'
  AND auth.role() = 'authenticated'
  AND is_org_admin_or_owner(auth.uid(), (storage.foldername(name))[2]::uuid)
);