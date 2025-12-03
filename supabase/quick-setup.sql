-- ============================================
-- PODCAST BRAIN - QUICK DATABASE SETUP
-- ============================================
-- Run this FIRST in Supabase SQL Editor
-- This creates the minimum tables needed to sign up/sign in
-- ============================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Create profiles table (for user data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. Create function to handle new user signup
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 6. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Create podcasts table
CREATE TABLE IF NOT EXISTS public.podcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  source_url TEXT,
  duration INTEGER,
  transcript TEXT,
  summary TEXT,
  topics TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'uploading' NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_status CHECK (status IN ('uploading', 'transcribing', 'processing', 'ready', 'error'))
);

-- 8. Create podcast_chunks table for RAG
CREATE TABLE IF NOT EXISTS public.podcast_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_id UUID REFERENCES public.podcasts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  start_time REAL,
  end_time REAL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 9. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  podcast_id UUID REFERENCES public.podcasts(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant'))
);

-- 10. Enable RLS on all tables
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies for podcasts
DROP POLICY IF EXISTS "Users can view own podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Users can create podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Users can update own podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "Users can delete own podcasts" ON public.podcasts;

CREATE POLICY "Users can view own podcasts"
  ON public.podcasts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create podcasts"
  ON public.podcasts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own podcasts"
  ON public.podcasts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own podcasts"
  ON public.podcasts FOR DELETE USING (auth.uid() = user_id);

-- 12. Create RLS policies for podcast_chunks
DROP POLICY IF EXISTS "Users can view own podcast chunks" ON public.podcast_chunks;
DROP POLICY IF EXISTS "Users can insert own podcast chunks" ON public.podcast_chunks;
DROP POLICY IF EXISTS "Users can delete own podcast chunks" ON public.podcast_chunks;

CREATE POLICY "Users can view own podcast chunks"
  ON public.podcast_chunks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.podcasts WHERE podcasts.id = podcast_chunks.podcast_id AND podcasts.user_id = auth.uid()));
CREATE POLICY "Users can insert own podcast chunks"
  ON public.podcast_chunks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.podcasts WHERE podcasts.id = podcast_chunks.podcast_id AND podcasts.user_id = auth.uid()));
CREATE POLICY "Users can delete own podcast chunks"
  ON public.podcast_chunks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.podcasts WHERE podcasts.id = podcast_chunks.podcast_id AND podcasts.user_id = auth.uid()));

-- 13. Create RLS policies for chat_messages
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;

CREATE POLICY "Users can view own chat messages"
  ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create chat messages"
  ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- 14. Create vector similarity search function
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
    (filter_user_id IS NULL OR p.user_id = filter_user_id)
    AND (filter_podcast_id IS NULL OR pc.podcast_id = filter_podcast_id)
    AND pc.embedding IS NOT NULL
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 15. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_podcasts_user_id ON public.podcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_status ON public.podcasts(status);
CREATE INDEX IF NOT EXISTS idx_podcast_chunks_podcast_id ON public.podcast_chunks(podcast_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_podcast_id ON public.chat_messages(podcast_id);

-- 16. Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'podcasts',
  'podcasts',
  true, -- Make public so audio can stream
  104857600, -- 100MB
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 17. Create storage policies
DROP POLICY IF EXISTS "Users can upload podcast audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view podcast audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own podcast audio" ON storage.objects;

CREATE POLICY "Users can upload podcast audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'podcasts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view podcast audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'podcasts');

CREATE POLICY "Users can delete own podcast audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'podcasts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- DONE! You can now sign up and use the app.
-- ============================================
