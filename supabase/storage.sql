-- ============================================
-- PODCAST BRAIN - SUPABASE STORAGE SETUP
-- ============================================
-- Run this in the Supabase SQL Editor AFTER running schema.sql
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ============================================

-- ============================================
-- 1. CREATE STORAGE BUCKET
-- ============================================

-- Delete existing bucket if you need to recreate (uncomment if needed)
-- DELETE FROM storage.objects WHERE bucket_id = 'podcasts';
-- DELETE FROM storage.buckets WHERE id = 'podcasts';

-- Create the podcasts bucket for audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'podcasts',
  'podcasts',
  false, -- Private bucket (authenticated access only)
  104857600, -- 100MB in bytes (100 * 1024 * 1024)
  ARRAY[
    'audio/mpeg',      -- MP3 files
    'audio/mp3',       -- MP3 (alternative MIME)
    'audio/wav',       -- WAV files
    'audio/wave',      -- WAV (alternative MIME)
    'audio/x-wav',     -- WAV (alternative MIME)
    'audio/mp4',       -- M4A/MP4 audio
    'audio/x-m4a',     -- M4A (alternative MIME)
    'audio/aac',       -- AAC files
    'audio/ogg',       -- OGG files
    'audio/webm',      -- WebM audio
    'audio/flac'       -- FLAC files (bonus format)
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 2. DROP EXISTING POLICIES (for clean recreation)
-- ============================================

DROP POLICY IF EXISTS "Users can upload podcast audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own podcast audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own podcast audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own podcast audio" ON storage.objects;

-- ============================================
-- 3. CREATE STORAGE RLS POLICIES
-- ============================================

-- Policy: Users can upload audio files to their own folder
-- File path format: {user_id}/{filename}
CREATE POLICY "Users can upload podcast audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'podcasts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view/download their own audio files
CREATE POLICY "Users can view own podcast audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'podcasts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own audio files
CREATE POLICY "Users can update own podcast audio"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'podcasts'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'podcasts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own audio files
CREATE POLICY "Users can delete own podcast audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'podcasts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 4. VERIFY SETUP
-- ============================================

-- Check bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'podcasts';

-- Check policies were created
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%podcast%';

-- ============================================
-- STORAGE SETUP COMPLETE!
-- ============================================
--
-- Bucket: podcasts
-- - Private (authenticated access only)
-- - 100MB file size limit
-- - Audio files only (MP3, WAV, M4A, AAC, OGG, WebM, FLAC)
--
-- File path convention:
-- {user_id}/{podcast_id}/{filename}
-- Example: 550e8400-e29b-41d4-a716-446655440000/episode-1.mp3
--
-- Usage in code:
-- const { data, error } = await supabase.storage
--   .from('podcasts')
--   .upload(`${userId}/${podcastId}/${file.name}`, file);
--
-- Get public URL (signed, time-limited):
-- const { data } = await supabase.storage
--   .from('podcasts')
--   .createSignedUrl(`${userId}/${podcastId}/${filename}`, 3600);
--
-- ============================================
