/**
 * Podcasts API Route
 * 
 * GET /api/podcasts - List podcasts for authenticated user
 * POST /api/podcasts - Create new podcast entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import type { Podcast, PodcastStatus } from '@/types';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createPodcastSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(5000, 'Description too long').nullable().optional(),
  audio_url: z.string().url('Invalid audio URL'),
  audio_path: z.string().optional(), // Storage path for deletion
  source_url: z.string().url('Invalid source URL').nullable().optional(),
  duration: z.number().positive().nullable().optional(),
});

type CreatePodcastInput = z.infer<typeof createPodcastSchema>;

// ============================================
// GET /api/podcasts
// ============================================

/**
 * Get podcasts for the authenticated user
 * 
 * Query params:
 * - search: Filter by title (contains)
 * - status: Filter by status
 * - limit: Number of results (default 20, max 100)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status') as PodcastStatus | null;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20', 10),
      100
    );
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('podcasts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply search filter
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: podcasts, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch podcasts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      podcasts: podcasts as Podcast[],
      total: count || 0,
    });
  } catch (error) {
    console.error('GET /api/podcasts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/podcasts
// ============================================

/**
 * Create a new podcast entry
 * 
 * Request body:
 * - title: string (required)
 * - description: string (optional)
 * - audio_url: string (required)
 * - audio_path: string (optional, for storage deletion)
 * - source_url: string (optional)
 * - duration: number (optional)
 */
export async function POST(request: NextRequest) {
  try {
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

    // Parse and validate request body
    let body: CreatePodcastInput;
    try {
      const rawBody = await request.json();
      body = createPodcastSchema.parse(rawBody);
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

    // Create podcast record
    const { data: podcast, error: insertError } = await supabase
      .from('podcasts')
      .insert({
        user_id: user.id,
        title: body.title,
        description: body.description || null,
        audio_url: body.audio_url,
        source_url: body.source_url || null,
        duration: body.duration || null,
        status: 'uploading' as PodcastStatus,
        topics: [],
        transcript: null,
        summary: null,
        error_message: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create podcast' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: podcast as Podcast },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/podcasts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
