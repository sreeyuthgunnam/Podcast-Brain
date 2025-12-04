/**
 * Reindex API Route
 * POST: Retry indexing for stuck podcasts
 * 
 * This endpoint is specifically designed for podcasts that got stuck
 * in 'processing' status due to Vercel function timeouts or other issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { indexPodcastChunks, getChunkCount } from '@/lib/vectors';

// Increase timeout for embedding generation
export const maxDuration = 60; // 60 seconds (Vercel Pro)

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
      .select('id, user_id, status, title, transcript')
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

    // Verify podcast has transcript
    if (!podcast.transcript) {
      return NextResponse.json(
        {
          success: false,
          error: 'Podcast has no transcript. Please transcribe first.',
        },
        { status: 400 }
      );
    }

    console.log(`[Reindex] Starting reindex for podcast: ${podcast.title} (${podcastId})`);

    // Delete existing chunks (if any) to start fresh
    const { error: deleteError } = await supabase
      .from('podcast_chunks')
      .delete()
      .eq('podcast_id', podcastId);

    if (deleteError) {
      console.error('[Reindex] Failed to delete existing chunks:', deleteError);
      // Continue anyway - might be first time indexing
    }

    // Index the podcast chunks
    try {
      await indexPodcastChunks(podcastId, user.id);
    } catch (indexError) {
      console.error('[Reindex] Indexing failed:', indexError);
      
      // Update status to ready with error message
      await supabase
        .from('podcasts')
        .update({
          status: 'ready',
          error_message: 'Indexing failed - chat may not work.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', podcastId);

      return NextResponse.json({
        success: true,
        warning: 'Indexing failed, but podcast is now viewable. Chat may not work.',
        chunksCreated: 0,
      });
    }

    // Get chunk count for response
    const chunksCreated = await getChunkCount(podcastId);

    // Update podcast status to 'ready'
    const { error: updateError } = await supabase
      .from('podcasts')
      .update({
        status: 'ready',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', podcastId);

    if (updateError) {
      console.error('[Reindex] Failed to update podcast status:', updateError);
    }

    console.log(`[Reindex] Successfully reindexed podcast ${podcastId} with ${chunksCreated} chunks`);

    return NextResponse.json({
      success: true,
      chunksCreated,
    });
  } catch (error) {
    console.error('[Reindex] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reindex podcast',
      },
      { status: 500 }
    );
  }
}
