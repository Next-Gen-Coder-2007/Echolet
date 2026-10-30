-- =========================================================================
-- ECHOLET SUPABASE STORAGE POLICIES & SETUP
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- =========================================================================

-- 1. Create or ensure the 'echolet-media' storage bucket exists with public access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'echolet-media',
  'echolet-media',
  true,
  131072000, -- 125 MB file size limit in bytes
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/aac',
    'audio/m4a',
    'application/pdf',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Enable Row Level Security (RLS) on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow anyone (public & authenticated) to view and read media assets
DROP POLICY IF EXISTS "Public media read access" ON storage.objects;
CREATE POLICY "Public media read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'echolet-media');

-- 4. Policy: Allow authenticated users to upload files only into their own user-scoped folders
-- Expected path format: {folder}/{userId}/{filename}
DROP POLICY IF EXISTS "Authenticated users upload to own folder" ON storage.objects;
CREATE POLICY "Authenticated users upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'echolet-media' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- 5. Policy: Allow users to update only their own files
DROP POLICY IF EXISTS "Users update own files" ON storage.objects;
CREATE POLICY "Users update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'echolet-media' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- 6. Policy: Allow users to delete only their own files
DROP POLICY IF EXISTS "Users delete own files" ON storage.objects;
CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'echolet-media' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );
