/**
 * Embedding API Route
 * POST: Index podcast transcript for vector search
 * - Chunks transcript into semantic segments
 * - Generates embeddings via OpenAI
 * - Stores vectors in Supabase pgvector
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { indexPodcastChunks, getChunkCount } from '@/lib/vectors';

// ============================================================================
// POST /api/embed - Index podcast for vector search
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { podcastId } = body;

    if (!podcastId) {
      return NextResponse.json(
        { success: false, error: 'Missing podcastId' },
        { status: 400 }
      );
    }

    // Fetch podcast and verify ownership
    const { data: podcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('id, user_id, status, title')
      .eq('id', podcastId)
      .single();

    if (fetchError || !podcast) {
      return NextResponse.json(
        { success: false, error: 'Podcast not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (podcast.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not own this podcast' },
        { status: 403 }
      );
    }

    // Verify podcast has transcript (status should be 'processing' or later)
    const validStatuses = ['processing', 'completed', 'ready'];
    if (!validStatuses.includes(podcast.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Podcast must have a transcript before indexing. Current status: ${podcast.status}`,
        },
        { status: 400 }
      );
    }

    // Update status to 'processing' if not already
    if (podcast.status !== 'processing') {
      await supabase
        .from('podcasts')
        .update({ status: 'processing', error_message: null })
        .eq('id', podcastId);
    }

    console.log(`Starting indexing for podcast: ${podcast.title} (${podcastId})`);

    // Index the podcast chunks
    await indexPodcastChunks(podcastId, user.id);

    // Get chunk count for response
    const chunksCreated = await getChunkCount(podcastId);

    // Update podcast status to 'ready'
    const { error: updateError } = await supabase
      .from('podcasts')
      .update({
        status: 'ready',
        error_message: null,
      })
      .eq('id', podcastId);

    if (updateError) {
      console.error('Failed to update podcast status:', updateError);
    }

    console.log(`Successfully indexed podcast ${podcastId} with ${chunksCreated} chunks`);

    return NextResponse.json({
      success: true,
      chunksCreated,
    });
  } catch (error) {
    console.error('Embedding error:', error);

    // Try to update podcast status to error
    try {
      const supabase = await createClient();
      const body = await request.clone().json();
      const { podcastId } = body;

      if (podcastId) {
        await supabase
          .from('podcasts')
          .update({
            status: 'error',
            error_message:
              error instanceof Error ? error.message : 'Failed to index podcast',
          })
          .eq('id', podcastId);
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to index podcast',
      },
      { status: 500 }
    );
  }
}
