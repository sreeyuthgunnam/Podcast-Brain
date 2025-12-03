-- ============================================
-- PODCAST BRAIN - SUPABASE DATABASE SCHEMA
-- ============================================
-- Run this entire script in the Supabase SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- 
-- This script is IDEMPOTENT - safe to run multiple times
-- ============================================

-- ============================================
-- 1. ENABLE EXTENSIONS
-- ============================================

-- Enable pgvector for storing and searching embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================
-- 2. CREATE TABLES (IF NOT EXISTS)
-- ============================================

-- ---------------------------------------------
-- PROFILES TABLE
-- Extends Supabase auth.users with additional profile data
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add comment for documentation
COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users';

-- ---------------------------------------------
-- PODCASTS TABLE
-- Main podcast/episode entity
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.podcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  source_url TEXT,
  duration INTEGER, -- Duration in seconds
  transcript TEXT,
  summary TEXT,
  topics TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'uploading' NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Validate status values
  CONSTRAINT valid_status CHECK (status IN ('uploading', 'transcribing', 'processing', 'ready', 'error'))
);

COMMENT ON TABLE public.podcasts IS 'Uploaded podcasts and episodes';
COMMENT ON COLUMN public.podcasts.status IS 'Processing status: uploading, transcribing, processing, ready, error';
COMMENT ON COLUMN public.podcasts.duration IS 'Duration in seconds';

-- ---------------------------------------------
-- PODCAST_CHUNKS TABLE
-- Transcript segments with embeddings for RAG
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.podcast_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_id UUID REFERENCES public.podcasts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  start_time REAL, -- Start time in seconds
  end_time REAL, -- End time in seconds
  chunk_index INTEGER NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.podcast_chunks IS 'Transcript chunks with vector embeddings for RAG search';
COMMENT ON COLUMN public.podcast_chunks.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';

-- ---------------------------------------------
-- CHAT_MESSAGES TABLE
-- Chat history with source citations
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  podcast_id UUID REFERENCES public.podcasts(id) ON DELETE CASCADE, -- NULL = chat across all podcasts
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  sources JSONB, -- Array of ChatSource objects for citations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Validate role values
  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant'))
);

COMMENT ON TABLE public.chat_messages IS 'Chat conversation history with source citations';
COMMENT ON COLUMN public.chat_messages.podcast_id IS 'NULL means chat across all user podcasts';
COMMENT ON COLUMN public.chat_messages.sources IS 'JSON array of source citations for assistant responses';

-- ============================================
-- 3. CREATE INDEXES (IF NOT EXISTS)
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Podcasts indexes
CREATE INDEX IF NOT EXISTS idx_podcasts_user_id ON public.podcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON public.podcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_podcasts_status ON public.podcasts(status);
CREATE INDEX IF NOT EXISTS idx_podcasts_user_status ON public.podcasts(user_id, status);

-- Podcast chunks indexes
CREATE INDEX IF NOT EXISTS idx_podcast_chunks_podcast_id ON public.podcast_chunks(podcast_id);
CREATE INDEX IF NOT EXISTS idx_podcast_chunks_chunk_index ON public.podcast_chunks(podcast_id, chunk_index);

-- Vector similarity search index using IVFFlat
-- Note: This index is created after data is inserted for better performance
-- For small datasets, you can create it immediately
-- For large datasets (100k+ rows), create after initial data load
CREATE INDEX IF NOT EXISTS idx_podcast_chunks_embedding ON public.podcast_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_podcast_id ON public.chat_messages(podcast_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_podcast ON public.chat_messages(user_id, podcast_id, created_at DESC);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES
-- ============================================
-- Drop ALL existing policies first for idempotency

-- Drop all policies upfront
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Users can create podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Users can update own podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Users can delete own podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Users can view own podcast chunks" ON public.podcast_chunks;
DROP POLICY IF EXISTS "Users can insert own podcast chunks" ON public.podcast_chunks;
DROP POLICY IF EXISTS "Users can delete own podcast chunks" ON public.podcast_chunks;
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;

-- ---------------------------------------------
-- PROFILES POLICIES
-- ---------------------------------------------

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------
-- PODCASTS POLICIES
-- ---------------------------------------------

-- Users can view their own podcasts
CREATE POLICY "Users can view own podcasts"
  ON public.podcasts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create podcasts
CREATE POLICY "Users can create podcasts"
  ON public.podcasts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own podcasts
CREATE POLICY "Users can update own podcasts"
  ON public.podcasts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own podcasts
CREATE POLICY "Users can delete own podcasts"
  ON public.podcasts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------
-- PODCAST_CHUNKS POLICIES
-- ---------------------------------------------

-- Users can view chunks of their own podcasts
CREATE POLICY "Users can view own podcast chunks"
  ON public.podcast_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.podcasts
      WHERE podcasts.id = podcast_chunks.podcast_id
      AND podcasts.user_id = auth.uid()
    )
  );

-- Users can insert chunks for their own podcasts
CREATE POLICY "Users can insert own podcast chunks"
  ON public.podcast_chunks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.podcasts
      WHERE podcasts.id = podcast_chunks.podcast_id
      AND podcasts.user_id = auth.uid()
    )
  );

-- Users can delete chunks of their own podcasts
CREATE POLICY "Users can delete own podcast chunks"
  ON public.podcast_chunks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.podcasts
      WHERE podcasts.id = podcast_chunks.podcast_id
      AND podcasts.user_id = auth.uid()
    )
  );

-- ---------------------------------------------
-- CHAT_MESSAGES POLICIES
-- ---------------------------------------------

-- Users can view their own chat messages
CREATE POLICY "Users can view own chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create chat messages
CREATE POLICY "Users can create chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own chat messages
CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. CREATE FUNCTIONS
-- ============================================

-- ---------------------------------------------
-- Function: Handle new user signup
-- Automatically creates a profile when a new user signs up
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger: Call handle_new_user on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------
-- Function: Update updated_at timestamp
-- Automatically updates the updated_at column
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger: Update updated_at on profiles
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Trigger: Update updated_at on podcasts
CREATE OR REPLACE TRIGGER update_podcasts_updated_at
  BEFORE UPDATE ON public.podcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------
-- Function: Vector similarity search for RAG
-- Searches podcast chunks by embedding similarity
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  filter_podcast_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  podcast_id UUID,
  content TEXT,
  start_time REAL,
  end_time REAL,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.podcast_id,
    pc.content,
    pc.start_time,
    pc.end_time,
    pc.chunk_index,
    1 - (pc.embedding <=> query_embedding) AS similarity
  FROM public.podcast_chunks pc
  INNER JOIN public.podcasts p ON p.id = pc.podcast_id
  WHERE
    -- Filter by user (required for security)
    (filter_user_id IS NULL OR p.user_id = filter_user_id)
    -- Optionally filter by specific podcast
    AND (filter_podcast_id IS NULL OR pc.podcast_id = filter_podcast_id)
    -- Only search chunks with embeddings
    AND pc.embedding IS NOT NULL
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_chunks IS 'Vector similarity search for RAG. Returns most similar chunks to the query embedding.';

-- ---------------------------------------------
-- Function: Get podcast with chunk count
-- Helper function to get podcast details with chunk statistics
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.get_podcast_with_stats(podcast_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  audio_url TEXT,
  duration INTEGER,
  status TEXT,
  chunk_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.description,
    p.audio_url,
    p.duration,
    p.status,
    COUNT(pc.id) AS chunk_count,
    p.created_at
  FROM public.podcasts p
  LEFT JOIN public.podcast_chunks pc ON pc.podcast_id = p.id
  WHERE p.id = podcast_uuid
  GROUP BY p.id;
END;
$$;

-- ============================================
-- 7. STORAGE SETUP
-- ============================================
-- Storage bucket and policies are in a separate file: storage.sql
-- Run storage.sql AFTER this schema.sql
-- 
-- The storage.sql file creates:
-- - 'podcasts' bucket (private, 100MB limit, audio files only)
-- - RLS policies for user file access
-- ============================================

-- ============================================
-- SCHEMA COMPLETE!
-- ============================================
-- 
-- Next steps:
-- 1. Copy your Supabase URL and keys to .env.local
-- 2. Test the schema by creating a user account
-- 3. Verify the profile was auto-created
--
-- Tables created:
-- - profiles (user profiles)
-- - podcasts (podcast episodes)
-- - podcast_chunks (transcript segments with embeddings)
-- - chat_messages (chat history)
--
-- Functions created:
-- - handle_new_user() - auto-create profile on signup
-- - update_updated_at() - auto-update timestamps
-- - match_chunks() - vector similarity search for RAG
-- - get_podcast_with_stats() - get podcast with chunk count
--
-- Storage:
-- - podcasts bucket for audio files
--
-- ============================================
