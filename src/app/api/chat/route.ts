/**
 * Chat API Route
 * POST: RAG-powered chat with podcast content
 * - Receives user message
 * - Generates embedding for query
 * - Searches similar chunks in pgvector
 * - Constructs prompt with context
 * - Returns response from OpenAI
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { searchSimilarChunks } from '@/lib/vectors';
import { chatWithContext } from '@/lib/openai';

// ============================================
// VALIDATION
// ============================================

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  podcastId: z.string().uuid('Invalid podcast ID').optional(),
});

// ============================================
// POST /api/chat
// ============================================

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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: z.infer<typeof chatRequestSchema>;
    try {
      const rawBody = await request.json();
      body = chatRequestSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request', details: error.issues },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { message, podcastId } = body;

    // Search for relevant chunks
    const searchResults = await searchSimilarChunks(message, user.id, {
      podcastId,
      limit: 5,
      similarityThreshold: 0.5,
    });

    // If no relevant content found
    if (searchResults.length === 0) {
      return NextResponse.json({
        response: "I couldn't find any relevant content in your podcasts to answer this question. Try asking something related to the topics covered in your uploaded podcasts.",
        sources: [],
      });
    }

    // Build context from search results
    const context = searchResults
      .map((r, i) => `[Source ${i + 1} - ${r.podcastTitle}]\n${r.content}`)
      .join('\n\n');

    // Generate response with OpenAI
    const response = await chatWithContext(message, context);

    // Format sources for response
    const sources = searchResults.map((r) => ({
      podcastId: r.podcastId,
      podcastTitle: r.podcastTitle,
      content: r.content.substring(0, 200) + (r.content.length > 200 ? '...' : ''),
      startTime: r.startTime,
      similarity: r.similarity,
    }));

    return NextResponse.json({
      response,
      sources,
    });
  } catch (error) {
    console.error('[Chat] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process chat' },
      { status: 500 }
    );
  }
}
