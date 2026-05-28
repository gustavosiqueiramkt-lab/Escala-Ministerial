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