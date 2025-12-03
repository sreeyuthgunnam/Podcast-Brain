/**
 * OpenAI Integration
 * 
 * Handles AI operations for Podcast Brain:
 * - Text embeddings (text-embedding-3-small)
 * - Summaries and topic extraction (gpt-4o-mini)
 * - RAG chat with context (gpt-4o-mini)
 */

import OpenAI from 'openai';

// ============================================
// CLIENT INITIALIZATION (LAZY)
// ============================================

let _openai: OpenAI | null = null;

/**
 * Get OpenAI client instance (lazy initialization)
 * This prevents errors during build time when env vars aren't available
 */
function getOpenAIClient(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// ============================================
// CONSTANTS
// ============================================

/** Embedding model - 1536 dimensions */
const EMBEDDING_MODEL = 'text-embedding-3-small';

/** Chat model for summaries and chat */
const CHAT_MODEL = 'gpt-4o-mini';

/** Max tokens for context to avoid hitting limits */
const MAX_CONTEXT_TOKENS = 12000;

/** Batch size for embedding requests */
const EMBEDDING_BATCH_SIZE = 100;

/** Max retries for rate limit errors */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY = 1000;

// ============================================
// TYPES
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class OpenAIError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate text to approximate token limit
 * Rough estimate: 1 token ≈ 4 characters
 */
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '...';
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error
      const isRateLimit =
        error instanceof Error &&
        (error.message.includes('rate_limit') ||
          error.message.includes('429') ||
          error.message.includes('Rate limit'));

      if (!isRateLimit || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff
      const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
      console.log(`Rate limited, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

// ============================================
// EMBEDDING FUNCTIONS
// ============================================

/**
 * Generate embedding for a single text
 * 
 * @param text - The text to embed
 * @returns 1536-dimension embedding vector
 * 
 * @example
 * ```ts
 * const embedding = await generateEmbedding("Hello world");
 * console.log(embedding.length); // 1536
 * ```
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new OpenAIError('Text cannot be empty', 'EMPTY_TEXT');
  }

  try {
    const response = await withRetry(() =>
      getOpenAIClient().embeddings.create({
        model: EMBEDDING_MODEL,
        input: text.trim(),
      })
    );

    return response.data[0].embedding;
  } catch (error) {
    console.error('Generate embedding error:', error);

    if (error instanceof OpenAIError) throw error;

    throw new OpenAIError(
      error instanceof Error ? error.message : 'Failed to generate embedding',
      'EMBEDDING_ERROR',
      true
    );
  }
}

/**
 * Generate embeddings for multiple texts in batches
 * 
 * @param texts - Array of texts to embed
 * @returns Array of embeddings in same order
 * 
 * @example
 * ```ts
 * const embeddings = await generateEmbeddings(["Hello", "World"]);
 * console.log(embeddings.length); // 2
 * ```
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  // Filter out empty texts and track indices
  const validTexts: { index: number; text: string }[] = [];
  texts.forEach((text, index) => {
    if (text && text.trim().length > 0) {
      validTexts.push({ index, text: text.trim() });
    }
  });

  if (validTexts.length === 0) {
    return texts.map(() => []);
  }

  const allEmbeddings: { index: number; embedding: number[] }[] = [];

  // Process in batches
  for (let i = 0; i < validTexts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = validTexts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchTexts = batch.map((item) => item.text);

    try {
      const response = await withRetry(() =>
        getOpenAIClient().embeddings.create({
          model: EMBEDDING_MODEL,
          input: batchTexts,
        })
      );

      // Map embeddings back to original indices
      response.data.forEach((item, batchIndex) => {
        allEmbeddings.push({
          index: batch[batchIndex].index,
          embedding: item.embedding,
        });
      });

      // Small delay between batches to avoid rate limits
      if (i + EMBEDDING_BATCH_SIZE < validTexts.length) {
        await sleep(100);
      }
    } catch (error) {
      console.error('Batch embedding error:', error);
      throw new OpenAIError(
        `Failed to generate embeddings for batch ${i / EMBEDDING_BATCH_SIZE + 1}`,
        'BATCH_EMBEDDING_ERROR',
        true
      );
    }
  }

  // Reconstruct array in original order
  const result: number[][] = texts.map(() => []);
  allEmbeddings.forEach(({ index, embedding }) => {
    result[index] = embedding;
  });

  return result;
}

// ============================================
// SUMMARY AND EXTRACTION FUNCTIONS
// ============================================

/**
 * Generate a summary of a podcast transcript
 * 
 * @param transcript - The full transcript text
 * @returns Concise summary in 3-5 paragraphs
 * 
 * @example
 * ```ts
 * const summary = await generateSummary(transcript);
 * console.log(summary);
 * ```
 */
export async function generateSummary(transcript: string): Promise<string> {
  if (!transcript || transcript.trim().length === 0) {
    throw new OpenAIError('Transcript cannot be empty', 'EMPTY_TRANSCRIPT');
  }

  const systemPrompt = `You are a helpful assistant that summarizes podcast transcripts. Create a concise but comprehensive summary covering the main topics, key insights, and important takeaways. Use 3-5 paragraphs.`;

  // Truncate if too long
  const truncatedTranscript = truncateToTokenLimit(transcript, MAX_CONTEXT_TOKENS);

  try {
    const response = await withRetry(() =>
      getOpenAIClient().chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Please summarize the following podcast transcript:\n\n${truncatedTranscript}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })
    );

    const summary = response.choices[0]?.message?.content;
    if (!summary) {
      throw new OpenAIError('No summary generated', 'NO_SUMMARY');
    }

    return summary.trim();
  } catch (error) {
    console.error('Generate summary error:', error);

    if (error instanceof OpenAIError) throw error;

    throw new OpenAIError(
      error instanceof Error ? error.message : 'Failed to generate summary',
      'SUMMARY_ERROR',
      true
    );
  }
}

/**
 * Extract main topics from a podcast transcript
 * 
 * @param transcript - The full transcript text
 * @returns Array of 5-10 topic strings
 * 
 * @example
 * ```ts
 * const topics = await extractTopics(transcript);
 * console.log(topics); // ["Machine Learning", "Neural Networks", ...]
 * ```
 */
export async function extractTopics(transcript: string): Promise<string[]> {
  if (!transcript || transcript.trim().length === 0) {
    return [];
  }

  const systemPrompt = `Extract 5-10 main topics discussed in this podcast transcript. Return as a JSON array of short topic strings (2-4 words each). Only return the JSON array, no other text.`;

  // Truncate if too long
  const truncatedTranscript = truncateToTokenLimit(transcript, MAX_CONTEXT_TOKENS);

  try {
    const response = await withRetry(() =>
      getOpenAIClient().chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Extract topics from this podcast transcript:\n\n${truncatedTranscript}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      // Handle both { topics: [...] } and direct array format
      const topics = Array.isArray(parsed) ? parsed : parsed.topics || [];
      return topics.filter((t: unknown) => typeof t === 'string').slice(0, 10);
    } catch {
      // Try to extract array from response
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        const topics = JSON.parse(match[0]);
        return topics.filter((t: unknown) => typeof t === 'string').slice(0, 10);
      }
      return [];
    }
  } catch (error) {
    console.error('Extract topics error:', error);
    return [];
  }
}

// ============================================
// CHAT FUNCTIONS
// ============================================

/**
 * Chat with context from podcast content
 * 
 * @param question - The user's question
 * @param context - Relevant podcast content for RAG
 * @param chatHistory - Previous messages for conversation continuity
 * @returns AI-generated answer
 * 
 * @example
 * ```ts
 * const answer = await chatWithContext(
 *   "What did they say about AI?",
 *   "The speaker mentioned that AI is transforming...",
 *   [{ role: 'user', content: 'Previous question' }]
 * );
 * ```
 */
export async function chatWithContext(
  question: string,
  context: string,
  chatHistory?: ChatMessage[]
): Promise<string> {
  if (!question || question.trim().length === 0) {
    throw new OpenAIError('Question cannot be empty', 'EMPTY_QUESTION');
  }

  const systemPrompt = `You are a helpful assistant answering questions about podcast content. Use the provided context to answer questions accurately. Always cite the specific parts of the podcast when relevant. If the context doesn't contain enough information to answer, say so.

Here is the relevant podcast content:

${truncateToTokenLimit(context, MAX_CONTEXT_TOKENS)}`;

  // Build messages array
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add chat history for context
  if (chatHistory && chatHistory.length > 0) {
    // Limit history to last 10 messages to avoid token limits
    const recentHistory = chatHistory.slice(-10);
    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });
  }

  // Add current question
  messages.push({ role: 'user', content: question });

  try {
    const response = await withRetry(() =>
      getOpenAIClient().chat.completions.create({
        model: CHAT_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      })
    );

    const answer = response.choices[0]?.message?.content;
    if (!answer) {
      throw new OpenAIError('No response generated', 'NO_RESPONSE');
    }

    return answer.trim();
  } catch (error) {
    console.error('Chat with context error:', error);

    if (error instanceof OpenAIError) throw error;

    throw new OpenAIError(
      error instanceof Error ? error.message : 'Failed to generate response',
      'CHAT_ERROR',
      true
    );
  }
}

// Export client getter for advanced use cases
export { getOpenAIClient };
