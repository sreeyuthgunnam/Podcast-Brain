/**
 * Transcription API Route
 * 
 * POST /api/transcribe
 * Starts transcription for a podcast using AssemblyAI
 * 
 * Flow:
 * 1. Validate request and ownership
 * 2. Update status to 'transcribing'
 * 3. Transcribe with AssemblyAI
 * 4. Generate/save summary and topics
 * 5. Update status to 'processing' (ready for embeddings)
 * 6. Return - client will call /api/embed separately
 * 
 * Note: Embedding is NOT done in background here because Vercel serverless
 * functions terminate immediately after response, killing any pending promises.
 * The client should call /api/embed after receiving the transcription response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { transcribePodcast, TranscriptionError } from '@/lib/assemblyai';
import { generateSummary, extractTopics } from '@/lib/openai';
import type { Podcast } from '@/types';

// ============================================
// VALIDATION
// ============================================

const transcribeRequestSchema = z.object({
  podcastId: z.string().uuid('Invalid podcast ID'),
});

// ============================================
// POST /api/transcribe
// ============================================

export async function POST(request: NextRequest) {
  let podcastId: string | undefined;

  try {
    const supabase = await createRouteHandlerClient();

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

    // Parse and validate request body
    let body: z.infer<typeof transcribeRequestSchema>;
    try {
      const rawBody = await request.json();
      body = transcribeRequestSchema.parse(rawBody);
      podcastId = body.podcastId;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid request', details: error.issues },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Fetch podcast and verify ownership
    const { data: podcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('*')
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
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Verify podcast is in correct status
    if (podcast.status !== 'uploading') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot transcribe podcast with status '${podcast.status}'` 
        },
        { status: 400 }
      );
    }

    // Update status to transcribing
    const { error: updateError } = await supabase
      .from('podcasts')
      .update({ 
        status: 'transcribing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', podcastId);

    if (updateError) {
      console.error(`[Transcribe] Failed to update status:`, updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update podcast status' },
        { status: 500 }
      );
    }

    // Start transcription
    let transcriptResult;
    try {
      transcriptResult = await transcribePodcast(podcast.audio_url);
    } catch (error) {
      // Handle transcription failure
      const errorMessage = error instanceof TranscriptionError 
        ? error.message 
        : 'Transcription failed';
      
      console.error(`[Transcribe] Transcription failed:`, error);

      // Update podcast with error
      await supabase
        .from('podcasts')
        .update({
          status: 'error',
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', podcastId);

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }

    // Process transcript - generate summary and topics
    let summary = transcriptResult.summary;
    let topics: string[] = [];

    // Generate summary if not provided by AssemblyAI
    if (!summary && transcriptResult.text) {
      try {
        summary = await generateSummary(transcriptResult.text);
      } catch {
        // Non-critical, continue without summary
      }
    }

    // Extract topics
    if (transcriptResult.text) {
      try {
        topics = await extractTopics(transcriptResult.text);
      } catch {
        // Non-critical, continue without topics
      }
    }

    // Update podcast with transcript data
    const { data: updatedPodcast, error: saveError } = await supabase
      .from('podcasts')
      .update({
        transcript: transcriptResult.text,
        summary: summary || null,
        topics: topics,
        duration: transcriptResult.audioDuration || podcast.duration,
        status: 'processing', // Ready for embedding
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', podcastId)
      .select()
      .single();

    if (saveError) {
      console.error(`[Transcribe] Failed to save transcript:`, saveError);
      
      // Update status to error
      await supabase
        .from('podcasts')
        .update({
          status: 'error',
          error_message: 'Failed to save transcript',
          updated_at: new Date().toISOString(),
        })
        .eq('id', podcastId);

      return NextResponse.json(
        { success: false, error: 'Failed to save transcript' },
        { status: 500 }
      );
    }

    // Return success - client will call /api/embed separately
    // Note: We don't do embedding here because Vercel kills background promises
    // after the response is sent, causing podcasts to get stuck in 'processing' status
    return NextResponse.json({
      success: true,
      podcast: updatedPodcast as Podcast,
      needsEmbedding: true, // Signal to client to call /api/embed
    });
  } catch (error) {
    console.error(`[Transcribe] Unexpected error:`, error);

    // Try to update podcast status to error
    if (podcastId) {
      try {
        const supabase = await createRouteHandlerClient();
        await supabase
          .from('podcasts')
          .update({
            status: 'error',
            error_message: 'An unexpected error occurred',
            updated_at: new Date().toISOString(),
          })
          .eq('id', podcastId);
      } catch (updateError) {
        console.error(`[Transcribe] Failed to update error status:`, updateError);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// CONFIG
// ============================================

// Increase timeout for long transcriptions
// Note: Vercel has a 10s limit on hobby, 60s on pro
// For production, use background jobs
export const maxDuration = 300; // 5 minutes (requires Vercel Pro)
