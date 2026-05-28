-- Schema completo do Escala Ministerial
-- Gerado em: 2026-05-28 16:40
-- Execute este arquivo no SQL Editor do Supabase (supabase.com -> SQL Editor -> New query)
--
-- NOTA: A migration 20260116145452 foi omitida pois continha apenas
-- dados de teste do ambiente Lovable com IDs de usuários inexistentes.


-- ============================================================
-- Migration: 20260109141448_3e80d5aa-cd40-4565-b6a8-10a9e7b8c810.sql
-- ============================================================

-- Create enum for volunteer roles
CREATE TYPE public.volunteer_role AS ENUM ('vocalist', 'instrumentalist', 'technician');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create volunteers table
CREATE TABLE public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role volunteer_role NOT NULL,
  instrument TEXT,
  skills TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  consecutive_sundays INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create unavailability table
CREATE TABLE public.unavailability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create songs table
CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  key TEXT NOT NULL,
  youtube_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create service_items table with order preserved
CREATE TABLE public.service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('song', 'moment')),
  song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  moment_title TEXT,
  item_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create service_volunteers junction table
CREATE TABLE public.service_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(service_id, volunteer_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_volunteers ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Volunteers policies (all authenticated users can CRUD)
CREATE POLICY "Authenticated users can view volunteers" ON public.volunteers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert volunteers" ON public.volunteers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update volunteers" ON public.volunteers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete volunteers" ON public.volunteers FOR DELETE TO authenticated USING (true);

-- Unavailability policies
CREATE POLICY "Authenticated users can view unavailability" ON public.unavailability FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert unavailability" ON public.unavailability FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update unavailability" ON public.unavailability FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete unavailability" ON public.unavailability FOR DELETE TO authenticated USING (true);

-- Songs policies
CREATE POLICY "Authenticated users can view songs" ON public.songs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert songs" ON public.songs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update songs" ON public.songs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete songs" ON public.songs FOR DELETE TO authenticated USING (true);

-- Services policies
CREATE POLICY "Authenticated users can view services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update services" ON public.services FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete services" ON public.services FOR DELETE TO authenticated USING (true);

-- Service items policies
CREATE POLICY "Authenticated users can view service items" ON public.service_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert service items" ON public.service_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update service items" ON public.service_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete service items" ON public.service_items FOR DELETE TO authenticated USING (true);

-- Service volunteers policies
CREATE POLICY "Authenticated users can view service volunteers" ON public.service_volunteers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert service volunteers" ON public.service_volunteers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete service volunteers" ON public.service_volunteers FOR DELETE TO authenticated USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_volunteers_updated_at BEFORE UPDATE ON public.volunteers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('song-files', 'song-files', true);

-- Storage policies for song files
CREATE POLICY "Authenticated users can upload song files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'song-files');
CREATE POLICY "Anyone can view song files" ON storage.objects FOR SELECT USING (bucket_id = 'song-files');
CREATE POLICY "Authenticated users can delete song files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'song-files');



-- ============================================================
-- Migration: 20260110142138_f977114e-cd91-4a10-b42f-a1ee910e7582.sql
-- ============================================================


-- 1. Add status column to service_volunteers
ALTER TABLE public.service_volunteers 
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';

-- Add check constraint for status values
ALTER TABLE public.service_volunteers 
ADD CONSTRAINT service_volunteers_status_check 
CHECK (status IN ('pending', 'confirmed', 'declined'));

-- 2. Create organizations table for multi-tenant support
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create organization_members table to link users to organizations
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 3. Add organization_id to services, songs, volunteers
ALTER TABLE public.services 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.songs 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.volunteers 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 4. Create security definer function to check organization membership
CREATE OR REPLACE FUNCTION public.is_organization_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
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
  )
$$;

-- 5. RLS Policies for organizations
CREATE POLICY "Users can view their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = id AND user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = id AND user_id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. RLS Policies for organization_members
CREATE POLICY "Members can view organization members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Owners and admins can manage members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = organization_members.organization_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Owners and admins can delete members"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id 
    AND om.user_id = auth.uid() 
    AND om.role IN ('owner', 'admin')
  )
);

-- 7. Update RLS policies for service_volunteers to allow updates
CREATE POLICY "Authenticated users can update service volunteers"
ON public.service_volunteers
FOR UPDATE
TO authenticated
USING (true);

-- 8. Add trigger for organizations updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();



-- ============================================================
-- Migration: 20260112145519_01a67d7d-4314-457e-872e-ffd5aabc60a7.sql
-- ============================================================

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



-- ============================================================
-- Migration: 20260112150535_8aa5a613-03fc-45d0-a5e3-1a63459ec57f.sql
-- ============================================================

-- Fix storage policies (drop existing first to avoid duplicates)
DROP POLICY IF EXISTS "Authenticated users can upload song files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update song files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete song files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view song files" ON storage.objects;

-- Recreate storage policies for song-files bucket
CREATE POLICY "Authenticated users can view song files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'song-files');

CREATE POLICY "Authenticated users can upload song files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'song-files');

CREATE POLICY "Authenticated users can update song files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'song-files');

CREATE POLICY "Authenticated users can delete song files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'song-files');



-- ============================================================
-- Migration: 20260112151458_53072f2d-da8c-4ef5-841f-be64f201da61.sql
-- ============================================================

-- Add notes field to service_items for musical direction annotations
ALTER TABLE public.service_items 
ADD COLUMN notes TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.service_items.notes IS 'Musical direction notes for the item (e.g., "Start soft on piano", "Prayer after 2nd verse")';



-- ============================================================
-- Migration: 20260113133953_44687ece-6fdb-4f7c-bbb2-32b9871c5f1d.sql
-- ============================================================

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



-- ============================================================
-- Migration: 20260113174612_062e1c2c-95b3-41ff-8398-95c80c0eeff8.sql
-- ============================================================

-- 1. Fix INSERT policy for organizations - allow any authenticated user to create
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Create trigger function to auto-add creator as owner
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$;

-- 3. Create trigger on organizations table
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();

-- 4. Add DELETE policy for organization_members (owners/admins can remove)
DROP POLICY IF EXISTS "Owners and admins can delete members" ON public.organization_members;

CREATE POLICY "Owners and admins can delete members"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);



-- ============================================================
-- Migration: 20260114130157_343ea96a-0ca4-4062-a3a0-c5c3e471e0f1.sql
-- ============================================================

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



-- ============================================================
-- Migration: 20260115203011_3354e83c-e0bf-4c82-b41d-274592a464c1.sql
-- ============================================================

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



-- ============================================================
-- OMITIDA (dados de teste): 20260116145452_700a60bd-3f18-4a91-b6aa-7f27aa8a742a.sql
-- ============================================================


-- ============================================================
-- Migration: 20260202201147_f9835647-fa5b-4938-9db5-818825d590bb.sql
-- ============================================================

-- FunÃ§Ã£o para auto-criar voluntÃ¡rio quando membro Ã© adicionado
CREATE OR REPLACE FUNCTION public.auto_create_volunteer_on_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_existing_volunteer UUID;
BEGIN
  -- Verificar se jÃ¡ existe voluntÃ¡rio para este user+org
  SELECT id INTO v_existing_volunteer
  FROM volunteers
  WHERE user_id = NEW.user_id 
    AND organization_id = NEW.organization_id;

  IF v_existing_volunteer IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar nome do perfil
  SELECT name INTO v_name
  FROM profiles
  WHERE user_id = NEW.user_id;

  IF v_name IS NULL THEN
    v_name := 'Novo VoluntÃ¡rio';
  END IF;

  -- Criar voluntÃ¡rio automaticamente
  INSERT INTO volunteers (user_id, organization_id, name, role, skills)
  VALUES (NEW.user_id, NEW.organization_id, v_name, 'vocalist', ARRAY[]::text[]);

  RETURN NEW;
END;
$$;

-- Trigger na tabela organization_members
DROP TRIGGER IF EXISTS trigger_auto_create_volunteer ON organization_members;
CREATE TRIGGER trigger_auto_create_volunteer
  AFTER INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_volunteer_on_membership();

-- Criar voluntÃ¡rios para membros existentes que ainda nÃ£o tÃªm
INSERT INTO volunteers (user_id, organization_id, name, role, skills)
SELECT 
  om.user_id,
  om.organization_id,
  COALESCE(p.name, 'VoluntÃ¡rio'),
  'vocalist',
  ARRAY[]::text[]
FROM organization_members om
LEFT JOIN profiles p ON p.user_id = om.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM volunteers v 
  WHERE v.user_id = om.user_id 
    AND v.organization_id = om.organization_id
);

-- Criar Ã­ndice Ãºnico para evitar duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteers_user_org 
ON volunteers (user_id, organization_id) 
WHERE user_id IS NOT NULL;



-- ============================================================
-- Migration: 20260204132642_46f326cb-c7fc-48a5-be8a-b0a48234d819.sql
-- ============================================================

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



-- ============================================================
-- Migration: 20260204212425_a07195f4-d6d6-415d-9113-e6419836b5e4.sql
-- ============================================================

-- =====================================================
-- UNIFICAÃ‡ÃƒO MEMBROS/VOLUNTÃRIOS: member_skills + ghost members
-- =====================================================

-- 0. PRIMEIRO: Tornar user_id nullable para permitir ghost members
ALTER TABLE public.organization_members ALTER COLUMN user_id DROP NOT NULL;

-- 1. Nova tabela para habilidades dos membros
CREATE TABLE public.member_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  volunteer_role public.volunteer_role NOT NULL DEFAULT 'vocalist',
  instrument TEXT,
  skills TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ, -- NULL = onboarding pendente
  UNIQUE(member_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.member_skills ENABLE ROW LEVEL SECURITY;

-- 3. PolÃ­ticas RLS
CREATE POLICY "Members can view org skills"
ON public.member_skills FOR SELECT
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = member_skills.member_id
    AND om.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
));

CREATE POLICY "Members can update own skills"
ON public.member_skills FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = member_skills.member_id
    AND om.user_id = auth.uid()
));

CREATE POLICY "Admins can update any skills"
ON public.member_skills FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = member_skills.member_id
    AND is_org_admin_or_owner(auth.uid(), om.organization_id)
));

CREATE POLICY "System can insert skills"
ON public.member_skills FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = member_skills.member_id
    AND (om.user_id = auth.uid() OR is_org_admin_or_owner(auth.uid(), om.organization_id))
));

CREATE POLICY "Admins can delete skills"
ON public.member_skills FOR DELETE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = member_skills.member_id
    AND is_org_admin_or_owner(auth.uid(), om.organization_id)
));

-- 4. Trigger para updated_at
CREATE TRIGGER update_member_skills_updated_at
BEFORE UPDATE ON public.member_skills
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Adicionar colunas para membros fantasma (voluntÃ¡rios manuais)
ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS is_ghost BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ghost_name TEXT,
ADD COLUMN IF NOT EXISTS ghost_avatar_url TEXT;

-- 6. Migrar voluntÃ¡rios COM user_id (criar member_skills)
INSERT INTO member_skills (member_id, volunteer_role, instrument, skills, completed_at)
SELECT om.id, v.role, v.instrument, COALESCE(v.skills, '{}'), now()
FROM volunteers v
JOIN organization_members om ON om.user_id = v.user_id AND om.organization_id = v.organization_id
WHERE v.user_id IS NOT NULL
ON CONFLICT (member_id) DO UPDATE SET
  volunteer_role = EXCLUDED.volunteer_role,
  instrument = EXCLUDED.instrument,
  skills = EXCLUDED.skills,
  completed_at = EXCLUDED.completed_at;

-- 7. Migrar voluntÃ¡rios SEM user_id como "ghost members"
INSERT INTO organization_members (organization_id, user_id, role, is_ghost, ghost_name, ghost_avatar_url)
SELECT 
  v.organization_id,
  NULL,
  'member',
  true,
  v.name,
  v.avatar_url
FROM volunteers v
WHERE v.user_id IS NULL;

-- 8. Criar member_skills para ghost members recÃ©m-criados
INSERT INTO member_skills (member_id, volunteer_role, instrument, skills, completed_at)
SELECT om.id, v.role, v.instrument, COALESCE(v.skills, '{}'), now()
FROM volunteers v
JOIN organization_members om ON om.ghost_name = v.name 
  AND om.organization_id = v.organization_id 
  AND om.is_ghost = true
WHERE v.user_id IS NULL
ON CONFLICT (member_id) DO NOTHING;

-- 9. Adicionar coluna member_id Ã s tabelas dependentes
ALTER TABLE service_volunteers ADD COLUMN IF NOT EXISTS member_id UUID;
ALTER TABLE unavailability ADD COLUMN IF NOT EXISTS member_id UUID;

-- 10. Migrar service_volunteers
UPDATE service_volunteers sv
SET member_id = om.id
FROM volunteers v
JOIN organization_members om ON (
  (v.user_id IS NOT NULL AND om.user_id = v.user_id AND om.organization_id = v.organization_id AND om.is_ghost = false)
  OR (v.user_id IS NULL AND om.is_ghost = true AND om.ghost_name = v.name AND om.organization_id = v.organization_id)
)
WHERE sv.volunteer_id = v.id AND sv.member_id IS NULL;

-- 11. Migrar unavailability
UPDATE unavailability u
SET member_id = om.id
FROM volunteers v
JOIN organization_members om ON (
  (v.user_id IS NOT NULL AND om.user_id = v.user_id AND om.organization_id = v.organization_id AND om.is_ghost = false)
  OR (v.user_id IS NULL AND om.is_ghost = true AND om.ghost_name = v.name AND om.organization_id = v.organization_id)
)
WHERE u.volunteer_id = v.id AND u.member_id IS NULL;

-- 12. Atualizar trigger para criar member_skills (substituir o antigo)
CREATE OR REPLACE FUNCTION public.auto_create_member_skills()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar member_skills para novos membros (nÃ£o ghost)
  IF NEW.is_ghost = false AND NEW.user_id IS NOT NULL THEN
    INSERT INTO member_skills (member_id, volunteer_role, skills)
    VALUES (NEW.id, 'vocalist', '{}')
    ON CONFLICT (member_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 13. Remover trigger antigo e criar novo
DROP TRIGGER IF EXISTS trigger_auto_create_volunteer ON organization_members;
DROP TRIGGER IF EXISTS trigger_auto_create_member_skills ON organization_members;

CREATE TRIGGER trigger_auto_create_member_skills
  AFTER INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_member_skills();

-- 14. Criar member_skills para membros existentes que ainda nÃ£o tÃªm
INSERT INTO member_skills (member_id, volunteer_role, skills)
SELECT om.id, 'vocalist', '{}'
FROM organization_members om
WHERE om.is_ghost = false 
  AND om.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM member_skills ms WHERE ms.member_id = om.id);

-- 15. Adicionar FK para member_id (sem DROP da coluna antiga ainda)
ALTER TABLE service_volunteers 
  ADD CONSTRAINT service_volunteers_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES organization_members(id) ON DELETE CASCADE;

ALTER TABLE unavailability 
  ADD CONSTRAINT unavailability_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES organization_members(id) ON DELETE CASCADE;

-- 16. Atualizar RLS para service_volunteers usando member_id
CREATE POLICY "Volunteers can update own status via member_id"
ON service_volunteers FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = service_volunteers.member_id
    AND om.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = service_volunteers.member_id
    AND om.user_id = auth.uid()
));

-- 17. Atualizar RLS para unavailability usando member_id
CREATE POLICY "Members can view unavailability via member_id"
ON unavailability FOR SELECT
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = unavailability.member_id
    AND om.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
));

CREATE POLICY "Members can insert unavailability via member_id"
ON unavailability FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = unavailability.member_id
    AND (om.user_id = auth.uid() OR is_org_admin_or_owner(auth.uid(), om.organization_id))
));

CREATE POLICY "Members can update unavailability via member_id"
ON unavailability FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = unavailability.member_id
    AND (om.user_id = auth.uid() OR is_org_admin_or_owner(auth.uid(), om.organization_id))
));

CREATE POLICY "Members can delete unavailability via member_id"
ON unavailability FOR DELETE
USING (EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.id = unavailability.member_id
    AND (om.user_id = auth.uid() OR is_org_admin_or_owner(auth.uid(), om.organization_id))
));



-- ============================================================
-- Migration: 20260205121454_59a725fc-5a7f-40af-b239-e34604a01cc1.sql
-- ============================================================

-- ============================================
-- FINALIZAÃ‡ÃƒO DA MIGRAÃ‡ÃƒO: Members como entidade Ãºnica
-- ============================================

-- 1. Remover constraint NOT NULL de volunteer_id nas tabelas que usam member_id
ALTER TABLE unavailability ALTER COLUMN volunteer_id DROP NOT NULL;
ALTER TABLE service_volunteers ALTER COLUMN volunteer_id DROP NOT NULL;

-- 2. Definir member_id como NOT NULL para novos registros (apÃ³s migraÃ§Ã£o de dados)
-- Primeiro, garantir que todos os registros tenham member_id preenchido
-- Para unavailability: Se nÃ£o tem member_id mas tem volunteer_id, buscar do voluntÃ¡rio
UPDATE unavailability u
SET member_id = (
  SELECT om.id 
  FROM volunteers v
  JOIN organization_members om ON om.user_id = v.user_id AND om.organization_id = v.organization_id
  WHERE v.id = u.volunteer_id
  LIMIT 1
)
WHERE u.member_id IS NULL AND u.volunteer_id IS NOT NULL;

-- Para service_volunteers: Se nÃ£o tem member_id mas tem volunteer_id, buscar do voluntÃ¡rio
UPDATE service_volunteers sv
SET member_id = (
  SELECT om.id 
  FROM volunteers v
  JOIN organization_members om ON om.user_id = v.user_id AND om.organization_id = v.organization_id
  WHERE v.id = sv.volunteer_id
  LIMIT 1
)
WHERE sv.member_id IS NULL AND sv.volunteer_id IS NOT NULL;

-- 3. Remover registros Ã³rfÃ£os (sem volunteer_id e sem member_id)
DELETE FROM unavailability WHERE volunteer_id IS NULL AND member_id IS NULL;
DELETE FROM service_volunteers WHERE volunteer_id IS NULL AND member_id IS NULL;

-- 4. Adicionar Ã­ndices para member_id para performance
CREATE INDEX IF NOT EXISTS idx_unavailability_member_id ON unavailability(member_id);
CREATE INDEX IF NOT EXISTS idx_service_volunteers_member_id ON service_volunteers(member_id);

-- 5. Desabilitar criaÃ§Ã£o de novos voluntÃ¡rios via tabela volunteers
-- Removendo a trigger que criava voluntÃ¡rios automaticamente
DROP TRIGGER IF EXISTS create_volunteer_on_membership ON organization_members;

-- 6. Revogar INSERT na tabela volunteers para o papel anon e authenticated
-- Isso impede que novos voluntÃ¡rios sejam criados pela aplicaÃ§Ã£o
REVOKE INSERT ON volunteers FROM anon;
REVOKE INSERT ON volunteers FROM authenticated;

-- 7. ComentÃ¡rio na tabela para indicar que estÃ¡ deprecated
COMMENT ON TABLE volunteers IS 'DEPRECATED: Tabela mantida apenas para compatibilidade com dados histÃ³ricos. Use organization_members + member_skills para novas funcionalidades.';



-- ============================================================
-- Migration: 20260206133032_ceab28ed-d877-4a4a-af8b-0c4c92a497fc.sql
-- ============================================================

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



-- ============================================================
-- Migration: 20260211132215_0b4089d0-d782-4ba7-87c2-bd2b3d619c75.sql
-- ============================================================

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


