# 🛠️ Podcast Brain - Setup Guide

This guide will walk you through setting up all the required services and configurations for Podcast Brain.

## Table of Contents

1. [Supabase Setup](#1-supabase-setup)
2. [API Keys](#2-api-keys)
3. [Environment Configuration](#3-environment-configuration)
4. [Local Development](#4-local-development)
5. [Deployment](#5-deployment)

---

## 1. Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `podcast-brain` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest to your users
4. Click **"Create new project"** and wait for setup (~2 minutes)

### 1.2 Get Your API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy and save:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **Important**: Never expose the `service_role` key in client-side code!

### 1.3 Enable pgvector Extension

1. Go to **Database** → **Extensions**
2. Search for `vector`
3. Click **Enable** on the `vector` extension

Or run this SQL in the SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 1.4 Create Database Tables

Go to **SQL Editor** and run the following SQL:

```sql
-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create podcasts table
CREATE TABLE IF NOT EXISTS podcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  audio_duration INTEGER, -- Duration in seconds
  file_size INTEGER, -- Size in bytes
  transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  transcription_text TEXT,
  transcription_id TEXT, -- AssemblyAI transcript ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create podcast_chunks table for RAG
CREATE TABLE IF NOT EXISTS podcast_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  start_time INTEGER, -- Start time in milliseconds
  end_time INTEGER, -- End time in milliseconds
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB, -- Array of source chunks used for the response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_podcasts_user_id ON podcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_podcast_chunks_podcast_id ON podcast_chunks(podcast_id);
CREATE INDEX IF NOT EXISTS idx_podcast_chunks_user_id ON podcast_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_podcast_id ON chat_messages(podcast_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Create vector similarity search index (IVFFlat for better performance)
CREATE INDEX IF NOT EXISTS idx_podcast_chunks_embedding ON podcast_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to podcasts table
DROP TRIGGER IF EXISTS update_podcasts_updated_at ON podcasts;
CREATE TRIGGER update_podcasts_updated_at
  BEFORE UPDATE ON podcasts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 1.5 Create Vector Search Function

Run this SQL to create the similarity search function:

```sql
-- Function to search podcast chunks by vector similarity
CREATE OR REPLACE FUNCTION match_podcast_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5,
  p_podcast_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  podcast_id UUID,
  content TEXT,
  chunk_index INTEGER,
  start_time INTEGER,
  end_time INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.podcast_id,
    pc.content,
    pc.chunk_index,
    pc.start_time,
    pc.end_time,
    1 - (pc.embedding <=> query_embedding) AS similarity
  FROM podcast_chunks pc
  WHERE 
    (p_podcast_id IS NULL OR pc.podcast_id = p_podcast_id)
    AND (p_user_id IS NULL OR pc.user_id = p_user_id)
    AND 1 - (pc.embedding <=> query_embedding) > match_threshold
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 1.6 Set Up Row Level Security (RLS)

Run this SQL to enable RLS and create policies:

```sql
-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Podcasts policies
CREATE POLICY "Users can view their own podcasts"
  ON podcasts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own podcasts"
  ON podcasts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own podcasts"
  ON podcasts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own podcasts"
  ON podcasts FOR DELETE
  USING (auth.uid() = user_id);

-- Podcast chunks policies
CREATE POLICY "Users can view their own chunks"
  ON podcast_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chunks"
  ON podcast_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chunks"
  ON podcast_chunks FOR DELETE
  USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view their own messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for API routes
-- Note: Service role key bypasses RLS automatically
```

### 1.7 Set Up Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **"New bucket"**
3. Configure:
   - **Name**: `podcast-audio`
   - **Public bucket**: ✅ Enabled (so audio can be streamed)
   - **File size limit**: `104857600` (100MB)
   - **Allowed MIME types**: `audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm`
4. Click **"Create bucket"**

Or run this SQL:

```sql
-- Create storage bucket via SQL (alternative method)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'podcast-audio',
  'podcast-audio',
  true,
  104857600,
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;
```

### 1.8 Storage Policies

Run this SQL to set up storage policies:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own audio files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'podcast-audio' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow anyone to read audio files (public bucket)
CREATE POLICY "Anyone can read audio files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'podcast-audio');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own audio files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'podcast-audio' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 1.9 Create User on Signup Trigger

Create a trigger to automatically create a user profile on signup:

```sql
-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

---

## 2. API Keys

### 2.1 OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to **API Keys** in the left sidebar
4. Click **"Create new secret key"**
5. Name it (e.g., "podcast-brain") and click **Create**
6. Copy the key immediately (you won't see it again!)

**Models used:**
- `text-embedding-3-small` - For creating vector embeddings
- `gpt-4o-mini` - For chat responses

**Estimated costs:**
- Embeddings: ~$0.02 per 1M tokens
- Chat: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens

### 2.2 AssemblyAI API Key

1. Go to [assemblyai.com](https://www.assemblyai.com)
2. Sign up or log in
3. Go to your **Dashboard**
4. Copy your **API Key** from the dashboard

**Pricing:**
- Pay-as-you-go: $0.37/hour of audio
- Free tier includes some credits for testing

---

## 3. Environment Configuration

### 3.1 Create Environment File

Create a `.env.local` file in your project root:

```env
# ===========================================
# Supabase Configuration
# ===========================================
# Get these from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===========================================
# OpenAI Configuration
# ===========================================
# Get this from: platform.openai.com → API Keys
OPENAI_API_KEY=sk-...

# ===========================================
# AssemblyAI Configuration
# ===========================================
# Get this from: assemblyai.com → Dashboard
ASSEMBLYAI_API_KEY=...

# ===========================================
# App Configuration
# ===========================================
# Use http://localhost:3000 for local development
# Use your production URL when deployed
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3.2 Environment Variable Validation

The app validates environment variables on startup. Missing variables will cause build errors.

---

## 4. Local Development

### 4.1 Install Dependencies

```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install
```

### 4.2 Run Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### 4.3 Development Tips

1. **Hot Reload**: The app automatically reloads when you save changes
2. **Error Overlay**: Build errors appear as overlays in the browser
3. **Type Checking**: Run `npm run type-check` to check for TypeScript errors
4. **Linting**: Run `npm run lint` to check for code style issues

### 4.4 Testing the Setup

1. **Auth Flow**:
   - Go to `/signup` and create an account
   - Check your email for the confirmation link
   - Log in at `/login`

2. **Upload Flow**:
   - Go to `/upload`
   - Upload a short audio file (< 5 minutes for testing)
   - Wait for transcription to complete

3. **Chat Flow**:
   - Open a completed podcast
   - Click "Chat"
   - Ask questions about the content

---

## 5. Deployment

### 5.1 Vercel Deployment (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click **"New Project"**
   - Import your GitHub repository

3. **Configure Environment Variables**
   - In Vercel project settings, go to **Environment Variables**
   - Add all variables from your `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY`
     - `ASSEMBLYAI_API_KEY`
     - `NEXT_PUBLIC_APP_URL` (set to your Vercel URL)

4. **Deploy**
   - Click **Deploy**
   - Wait for the build to complete

5. **Update Supabase**
   - Add your Vercel URL to Supabase Auth settings:
     - Go to **Authentication** → **URL Configuration**
     - Add your production URL to **Site URL**
     - Add to **Redirect URLs**: `https://your-app.vercel.app/**`

### 5.2 Custom Domain (Optional)

1. In Vercel, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` environment variable
5. Update Supabase redirect URLs

### 5.3 Production Checklist

- [ ] All environment variables set in production
- [ ] Supabase URL configuration updated
- [ ] Database tables created with RLS enabled
- [ ] Storage bucket configured
- [ ] pgvector extension enabled
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

---

## Troubleshooting

### Common Issues

**"Invalid API key" errors**
- Double-check your API keys in `.env.local`
- Ensure no extra spaces or quotes around values
- Restart the dev server after changing env vars

**"Row Level Security" errors**
- Ensure RLS policies are created
- Check that the user is authenticated
- Verify the user ID matches in policies

**"Storage upload failed"**
- Check bucket exists and is public
- Verify storage policies are set
- Ensure file size is under 100MB

**"Vector search not working"**
- Ensure pgvector extension is enabled
- Verify embeddings are being created
- Check the similarity threshold

**"Transcription stuck on processing"**
- Check AssemblyAI API key is valid
- Verify the audio URL is publicly accessible
- Check AssemblyAI dashboard for errors

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI Documentation](https://platform.openai.com/docs)
- [AssemblyAI Documentation](https://www.assemblyai.com/docs)

---

Happy podcasting! 🎙️
