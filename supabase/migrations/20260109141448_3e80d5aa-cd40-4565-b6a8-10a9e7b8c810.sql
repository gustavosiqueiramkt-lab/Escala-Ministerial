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