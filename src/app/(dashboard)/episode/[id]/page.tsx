/**
 * Episode Detail Page (Server Component)
 * - Fetches podcast by ID
 * - Verifies ownership
 * - Desktop: Two column layout (content + chat sidebar)
 * - Mobile: Tabbed interface
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EpisodePageClient } from './episode-page-client';

interface EpisodePageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: podcast } = await supabase
    .from('podcasts')
    .select('title, summary')
    .eq('id', id)
    .single();

  if (!podcast) {
    return {
      title: 'Episode Not Found',
    };
  }

  return {
    title: podcast.title,
    description: podcast.summary || `Listen to and chat with "${podcast.title}" on Podcast Brain.`,
  };
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch podcast with ownership check
  const { data: podcast, error } = await supabase
    .from('podcasts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !podcast) {
    notFound();
  }

  // Verify ownership
  if (podcast.user_id !== user.id) {
    notFound();
  }

  // Get chunk count for this podcast
  const { count: chunkCount } = await supabase
    .from('podcast_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('podcast_id', id);

  return (
    <EpisodePageClient
      podcast={podcast}
      chunkCount={chunkCount || 0}
    />
  );
}
