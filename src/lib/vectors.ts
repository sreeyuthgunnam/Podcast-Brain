/**
 * Vector Database Utilities
 * - Index podcast chunks with embeddings
 * - Semantic search using pgvector
 * - Delete podcast chunks
 */

import { createClient } from '@/lib/supabase/server';
import { generateEmbedding, generateEmbeddings } from '@/lib/openai';
import { chunkTranscript } from '@/lib/chunking';

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  chunkId: string;
  podcastId: string;
  podcastTitle: string;
  content: string;
  startTime: number | null;
  endTime: number | null;
  similarity: number;
}

export interface SearchOptions {
  podcastId?: string;
  limit?: number;
  similarityThreshold?: number;
}

interface PodcastChunkInsert {
  podcast_id: string;
  content: string;
  embedding: string;
  chunk_index: number;
  start_time: number | null;
  end_time: number | null;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMIT = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;
const BATCH_SIZE = 20; // Process embeddings in batches

// ============================================================================
// Index Podcast Chunks
// ============================================================================

/**
 * Index podcast transcript by chunking, generating embeddings, and storing in DB
 * @param podcastId - The podcast ID to index
 * @param userId - The user ID (for ownership verification)
 */
export async function indexPodcastChunks(
  podcastId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // Fetch podcast with transcript
  const { data: podcast, error: fetchError } = await supabase
    .from('podcasts')
    .select('id, title, transcript, user_id')
    .eq('id', podcastId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch podcast: ${fetchError.message}`);
  }

  if (!podcast) {
    throw new Error('Podcast not found');
  }

  // Verify ownership
  if (podcast.user_id !== userId) {
    throw new Error('Unauthorized: You do not own this podcast');
  }

  if (!podcast.transcript) {
    throw new Error('Podcast has no transcript to index');
  }

  // Delete existing chunks for this podcast (re-indexing)
  await deletePodcastChunks(podcastId);

  // Chunk the transcript
  const chunks = chunkTranscript(podcast.transcript);

  if (chunks.length === 0) {
    return;
  }

  // Process chunks in batches to avoid rate limits
  const chunkInserts: PodcastChunkInsert[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + BATCH_SIZE);
    const batchTexts = batchChunks.map((c) => c.content);

    // Generate embeddings for batch
    const embeddings = await generateEmbeddings(batchTexts);

    // Prepare inserts
    for (let j = 0; j < batchChunks.length; j++) {
      const chunk = batchChunks[j];
      const embedding = embeddings[j];

      chunkInserts.push({
        podcast_id: podcastId,
        content: chunk.content,
        embedding: JSON.stringify(embedding),
        chunk_index: chunk.chunkIndex,
        start_time: chunk.startTime,
        end_time: chunk.endTime,
      });
    }
  }

  // Insert all chunks in batches
  const insertBatchSize = 100;
  for (let i = 0; i < chunkInserts.length; i += insertBatchSize) {
    const batch = chunkInserts.slice(i, i + insertBatchSize);

    const { error: insertError } = await supabase
      .from('podcast_chunks')
      .insert(batch);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }
  }

  // Update podcast status to indicate indexing is complete
  const { error: updateError } = await supabase
    .from('podcasts')
    .update({ status: 'ready' })
    .eq('id', podcastId);

  if (updateError) {
    console.error(`Failed to update podcast status: ${updateError.message}`);
  }
}

// ============================================================================
// Search Similar Chunks
// ============================================================================

/**
 * Search for chunks similar to the query using semantic search
 * @param query - The search query
 * @param userId - The user ID (for filtering user's podcasts only)
 * @param options - Search options (podcastId filter, limit, threshold)
 */
export async function searchSimilarChunks(
  query: string,
  userId: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    podcastId,
    limit = DEFAULT_LIMIT,
    similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
  } = options;

  const supabase = await createClient();

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Try using the RPC function first
  try {
    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: similarityThreshold,
      match_count: limit,
      filter_user_id: userId,
      filter_podcast_id: podcastId || null,
    });

    if (!error && data && data.length > 0) {
      // Transform results to SearchResult format
      const results: SearchResult[] = data.map((row: {
        chunk_id: string;
        podcast_id: string;
        podcast_title: string;
        content: string;
        start_time: number | null;
        end_time: number | null;
        similarity: number;
      }) => ({
        chunkId: row.chunk_id,
        podcastId: row.podcast_id,
        podcastTitle: row.podcast_title,
        content: row.content,
        startTime: row.start_time,
        endTime: row.end_time,
        similarity: row.similarity,
      }));

      return results;
    }
    // RPC returned no results or failed, try fallback
  } catch {
    // RPC error, use fallback
  }

  // Fallback: Direct query without using match_chunks function
  // This works even if the function isn't set up correctly
  let queryBuilder = supabase
    .from('podcast_chunks')
    .select(`
      id,
      podcast_id,
      content,
      start_time,
      end_time,
      podcasts!inner(title, user_id)
    `)
    .eq('podcasts.user_id', userId);

  if (podcastId) {
    queryBuilder = queryBuilder.eq('podcast_id', podcastId);
  }

  const { data: chunks, error: queryError } = await queryBuilder.limit(limit * 2);

  if (queryError) {
    console.error('[Search] Direct query failed:', queryError.message);
    return [];
  }

  if (!chunks || chunks.length === 0) {
    return [];
  }

  // Return chunks without similarity scoring (basic fallback)
  // Note: Supabase joins return arrays, so we handle both cases
  const results: SearchResult[] = chunks.slice(0, limit).map((chunk) => {
    // Handle both array and object cases for the joined podcasts data
    const podcastData = Array.isArray(chunk.podcasts) 
      ? chunk.podcasts[0] 
      : chunk.podcasts;
    
    return {
      chunkId: chunk.id,
      podcastId: chunk.podcast_id,
      podcastTitle: podcastData?.title || 'Unknown',
      content: chunk.content,
      startTime: chunk.start_time,
      endTime: chunk.end_time,
      similarity: 0.8, // Default similarity for fallback
    };
  });

  return results;
}

// ============================================================================
// Delete Podcast Chunks
// ============================================================================

/**
 * Delete all chunks for a specific podcast
 * @param podcastId - The podcast ID whose chunks should be deleted
 */
export async function deletePodcastChunks(podcastId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('podcast_chunks')
    .delete()
    .eq('podcast_id', podcastId);

  if (error) {
    throw new Error(`Failed to delete chunks: ${error.message}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the count of chunks for a podcast
 * @param podcastId - The podcast ID
 */
export async function getChunkCount(podcastId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('podcast_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('podcast_id', podcastId);

  if (error) {
    throw new Error(`Failed to count chunks: ${error.message}`);
  }

  return count || 0;
}

/**
 * Check if a podcast has been indexed
 * @param podcastId - The podcast ID
 */
export async function isPodcastIndexed(podcastId: string): Promise<boolean> {
  const count = await getChunkCount(podcastId);
  return count > 0;
}
