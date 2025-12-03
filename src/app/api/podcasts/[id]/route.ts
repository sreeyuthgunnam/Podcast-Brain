/**
 * Single Podcast API Route
 * 
 * GET /api/podcasts/[id] - Get podcast by ID with chunks count
 * PATCH /api/podcasts/[id] - Update podcast metadata
 * DELETE /api/podcasts/[id] - Delete podcast and associated data
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import type { Podcast } from '@/types';

// ============================================
// TYPES
// ============================================

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updatePodcastSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(['uploading', 'transcribing', 'processing', 'ready', 'error']).optional(),
  transcript: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  topics: z.array(z.string()).optional(),
  error_message: z.string().nullable().optional(),
});

type UpdatePodcastInput = z.infer<typeof updatePodcastSchema>;

// ============================================
// GET /api/podcasts/[id]
// ============================================

/**
 * Get a single podcast by ID
 * 
 * Returns podcast with chunks count
 * Verifies ownership
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createRouteHandlerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch podcast
    const { data: podcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (podcast.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get chunks count
    const { count: chunksCount } = await supabase
      .from('podcast_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('podcast_id', id);

    return NextResponse.json({
      data: {
        ...podcast,
        chunks_count: chunksCount || 0,
      } as Podcast & { chunks_count: number },
    });
  } catch (error) {
    console.error('GET /api/podcasts/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/podcasts/[id]
// ============================================

/**
 * Update a podcast
 * 
 * Updatable fields: title, description, status, transcript, summary, topics
 * Verifies ownership
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createRouteHandlerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch podcast to verify ownership
    const { data: existingPodcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingPodcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingPodcast.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body: UpdatePodcastInput;
    try {
      const rawBody = await request.json();
      body = updatePodcastSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Update podcast
    const { data: updatedPodcast, error: updateError } = await supabase
      .from('podcasts')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update podcast' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: updatedPodcast as Podcast,
    });
  } catch (error) {
    console.error('PATCH /api/podcasts/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/podcasts/[id]
// ============================================

/**
 * Delete a podcast
 * 
 * Also deletes:
 * - Audio file from storage
 * - Associated chunks (via cascade)
 * - Associated chat messages (via cascade)
 * 
 * Verifies ownership
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createRouteHandlerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch podcast to verify ownership and get audio path
    const { data: podcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('user_id, audio_url')
      .eq('id', id)
      .single();

    if (fetchError || !podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (podcast.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Extract storage path from audio URL
    // URL format: .../storage/v1/object/public/podcasts/{path}
    const audioPath = extractStoragePath(podcast.audio_url);

    // Delete audio file from storage (if path exists)
    if (audioPath) {
      const { error: storageError } = await supabase.storage
        .from('podcasts')
        .remove([audioPath]);

      if (storageError) {
        console.warn('Failed to delete audio file:', storageError);
        // Continue with podcast deletion even if storage delete fails
      }
    }

    // Delete podcast (chunks will be cascade deleted)
    const { error: deleteError } = await supabase
      .from('podcasts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete podcast' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Podcast deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/podcasts/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract storage path from Supabase public URL
 */
function extractStoragePath(url: string): string | null {
  try {
    // URL format: https://{project}.supabase.co/storage/v1/object/public/podcasts/{path}
    const match = url.match(/\/storage\/v1\/object\/public\/podcasts\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
