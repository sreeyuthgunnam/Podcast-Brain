/**
 * Stats API Route
 * GET: Fetch dashboard statistics for the authenticated user
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

interface StatsResponse {
  totalPodcasts: number;
  totalDuration: number;
  totalChunks: number;
  totalChats: number;
  podcastsByStatus: {
    uploading: number;
    transcribing: number;
    processing: number;
    ready: number;
    error: number;
  };
  recentPodcasts: unknown[];
  recentChats: unknown[];
}

// ============================================================================
// GET /api/stats
// ============================================================================

export async function GET() {
  try {
    const supabase = await createClient();

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

    // Fetch all user's podcasts for aggregation
    const { data: podcasts, error: podcastsError } = await supabase
      .from('podcasts')
      .select('id, status, duration, created_at, title, topics, summary')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (podcastsError) {
      console.error('Failed to fetch podcasts:', podcastsError);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    const allPodcasts = podcasts || [];

    // Calculate total podcasts
    const totalPodcasts = allPodcasts.length;

    // Calculate total duration
    const totalDuration = allPodcasts.reduce(
      (sum, p) => sum + (p.duration || 0),
      0
    );

    // Calculate podcasts by status
    const podcastsByStatus = {
      uploading: 0,
      transcribing: 0,
      processing: 0,
      ready: 0,
      error: 0,
    };

    allPodcasts.forEach((podcast) => {
      const status = podcast.status as keyof typeof podcastsByStatus;
      if (status in podcastsByStatus) {
        podcastsByStatus[status]++;
      }
    });

    // Get podcast IDs for chunk count
    const podcastIds = allPodcasts.map((p) => p.id);

    // Get total chunks
    let totalChunks = 0;
    if (podcastIds.length > 0) {
      const { count, error: chunksError } = await supabase
        .from('podcast_chunks')
        .select('*', { count: 'exact', head: true })
        .in('podcast_id', podcastIds);

      if (!chunksError && count !== null) {
        totalChunks = count;
      }
    }

    // Get total chat messages
    const { count: chatCount, error: chatCountError } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const totalChats = !chatCountError && chatCount !== null ? chatCount : 0;

    // Get recent podcasts (last 5)
    const recentPodcasts = allPodcasts.slice(0, 5);

    // Get recent assistant chat messages with sources (last 5)
    const { data: recentChatsData, error: recentChatsError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'assistant')
      .not('sources', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    const recentChats = !recentChatsError ? recentChatsData || [] : [];

    const stats: StatsResponse = {
      totalPodcasts,
      totalDuration,
      totalChunks,
      totalChats,
      podcastsByStatus,
      recentPodcasts,
      recentChats,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
