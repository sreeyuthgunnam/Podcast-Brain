/**
 * Text Chunking Utilities
 * 
 * Functions for splitting transcripts into searchable chunks:
 * - Intelligent sentence-based chunking
 * - Overlap for context continuity
 * - Timestamp preservation from word-level data
 */

// ============================================
// TYPES
// ============================================

/**
 * Word with timestamp from transcription
 */
export interface TranscriptWord {
  text: string;
  start: number; // seconds
  end: number;   // seconds
}

/**
 * A chunk of transcript text with metadata
 */
export interface Chunk {
  /** The text content of this chunk */
  content: string;
  /** Start time in seconds (null if no timestamps available) */
  startTime: number | null;
  /** End time in seconds (null if no timestamps available) */
  endTime: number | null;
  /** Sequential index of this chunk */
  chunkIndex: number;
}

// ============================================
// CONSTANTS
// ============================================

/** Target words per chunk */
const TARGET_CHUNK_SIZE = 600;

/** Minimum words per chunk */
const MIN_CHUNK_SIZE = 400;

/** Maximum words per chunk */
const MAX_CHUNK_SIZE = 800;

/** Number of overlap sentences between chunks */
const OVERLAP_SENTENCES = 3;

/** Sentence ending patterns */
const SENTENCE_ENDINGS = /[.!?]+[\s]+/g;

// ============================================
// TEXT CLEANING
// ============================================

/**
 * Clean and normalize text for embedding
 * 
 * @param text - Raw text to clean
 * @returns Cleaned text
 * 
 * @example
 * ```ts
 * const cleaned = cleanText("  Hello   world!  \n\n  Test  ");
 * console.log(cleaned); // "Hello world! Test"
 * ```
 */
export function cleanText(text: string): string {
  if (!text) return '';

  return (
    text
      // Normalize unicode characters
      .normalize('NFKC')
      // Replace multiple newlines with single space
      .replace(/\n+/g, ' ')
      // Replace tabs with spaces
      .replace(/\t+/g, ' ')
      // Remove null characters and other control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Remove leading/trailing whitespace
      .trim()
  );
}

// ============================================
// SENTENCE SPLITTING
// ============================================

/**
 * Split text into sentences
 * 
 * @param text - Text to split
 * @returns Array of sentences
 */
function splitIntoSentences(text: string): string[] {
  if (!text) return [];

  // Split on sentence endings while preserving the punctuation
  const parts = text.split(SENTENCE_ENDINGS);
  
  // Filter out empty parts and trim
  const sentences = parts
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // If no sentences found, return the whole text as one sentence
  if (sentences.length === 0 && text.trim().length > 0) {
    return [text.trim()];
  }

  return sentences;
}

/**
 * Count words in a string
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

// ============================================
// TIMESTAMP CALCULATION
// ============================================

/**
 * Find the timestamp for a position in the transcript
 * 
 * @param words - Array of words with timestamps
 * @param text - The text to find
 * @param isStart - Whether to find start or end time
 * @returns Timestamp in seconds or null
 */
function _findTimestamp(
  words: TranscriptWord[],
  textPosition: number,
  isStart: boolean
): number | null {
  if (!words || words.length === 0) return null;

  // Reconstruct text to find word positions
  let currentPosition = 0;
  
  for (let i = 0; i < words.length; i++) {
    const wordLength = words[i].text.length;
    const wordEnd = currentPosition + wordLength;
    
    if (textPosition >= currentPosition && textPosition <= wordEnd) {
      return isStart ? words[i].start : words[i].end;
    }
    
    currentPosition = wordEnd + 1; // +1 for space
  }

  // Return first or last timestamp as fallback
  return isStart ? words[0].start : words[words.length - 1].end;
}

/**
 * Find timestamps for a chunk by matching its content to words
 * 
 * @param words - Array of words with timestamps
 * @param chunkContent - The chunk text content
 * @param fullTranscript - The full transcript text
 * @param chunkStartPosition - Position of chunk in transcript
 * @returns Object with start and end times
 */
function findChunkTimestamps(
  words: TranscriptWord[],
  chunkContent: string,
  fullTranscript: string,
  chunkStartPosition: number
): { startTime: number | null; endTime: number | null } {
  if (!words || words.length === 0) {
    return { startTime: null, endTime: null };
  }

  // Get first few words and last few words of chunk
  const chunkWords = chunkContent.split(/\s+/).filter((w) => w.length > 0);
  if (chunkWords.length === 0) {
    return { startTime: null, endTime: null };
  }

  // Find start time by looking for first word of chunk
  const firstWord = chunkWords[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  let startTime: number | null = null;
  let startWordIndex = 0;

  // Calculate approximate word position in transcript
  const wordsBeforeChunk = fullTranscript
    .substring(0, chunkStartPosition)
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  // Start searching from approximate position
  const searchStart = Math.max(0, wordsBeforeChunk - 10);
  
  for (let i = searchStart; i < words.length; i++) {
    const wordClean = words[i].text.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (wordClean === firstWord || wordClean.includes(firstWord)) {
      startTime = words[i].start;
      startWordIndex = i;
      break;
    }
  }

  // Find end time based on chunk length
  const endWordIndex = Math.min(
    startWordIndex + chunkWords.length - 1,
    words.length - 1
  );
  const endTime = words[endWordIndex]?.end ?? null;

  return { startTime, endTime };
}

// ============================================
// MAIN CHUNKING FUNCTION
// ============================================

/**
 * Split a transcript into chunks for embedding
 * 
 * Creates chunks of ~500-800 words with overlap for context continuity.
 * Preserves sentence boundaries and calculates timestamps if word data provided.
 * 
 * @param transcript - The full transcript text
 * @param words - Optional array of words with timestamps
 * @returns Array of chunks with metadata
 * 
 * @example
 * ```ts
 * // Without timestamps
 * const chunks = chunkTranscript(longTranscript);
 * 
 * // With timestamps
 * const chunks = chunkTranscript(longTranscript, words);
 * chunks.forEach(chunk => {
 *   console.log(`[${chunk.startTime}s] ${chunk.content.substring(0, 50)}...`);
 * });
 * ```
 */
export function chunkTranscript(
  transcript: string,
  words?: TranscriptWord[]
): Chunk[] {
  if (!transcript || transcript.trim().length === 0) {
    return [];
  }

  // Clean the transcript
  const cleanedTranscript = cleanText(transcript);
  
  // Split into sentences
  const sentences = splitIntoSentences(cleanedTranscript);
  
  if (sentences.length === 0) {
    return [];
  }

  // If transcript is short enough, return as single chunk
  const totalWords = countWords(cleanedTranscript);
  if (totalWords <= MAX_CHUNK_SIZE) {
    const { startTime, endTime } = words
      ? findChunkTimestamps(words, cleanedTranscript, cleanedTranscript, 0)
      : { startTime: null, endTime: null };

    return [
      {
        content: cleanedTranscript,
        startTime,
        endTime,
        chunkIndex: 0,
      },
    ];
  }

  const chunks: Chunk[] = [];
  let currentSentences: string[] = [];
  let currentWordCount = 0;
  let overlapSentences: string[] = [];
  let currentPosition = 0; // Track position in transcript

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceWords = countWords(sentence);

    // Add sentence to current chunk
    currentSentences.push(sentence);
    currentWordCount += sentenceWords;

    // Check if we should create a new chunk
    const shouldCreateChunk =
      currentWordCount >= TARGET_CHUNK_SIZE ||
      (currentWordCount >= MIN_CHUNK_SIZE && i === sentences.length - 1);

    if (shouldCreateChunk) {
      // Create chunk content
      const chunkContent = [...overlapSentences, ...currentSentences].join('. ') + '.';
      const chunkStartPosition = currentPosition;

      // Find timestamps if words provided
      const { startTime, endTime } = words
        ? findChunkTimestamps(words, chunkContent, cleanedTranscript, chunkStartPosition)
        : { startTime: null, endTime: null };

      chunks.push({
        content: cleanText(chunkContent),
        startTime,
        endTime,
        chunkIndex: chunks.length,
      });

      // Prepare overlap for next chunk
      overlapSentences = currentSentences.slice(-OVERLAP_SENTENCES);
      
      // Update position tracker
      currentPosition += chunkContent.length;

      // Reset current chunk
      currentSentences = [];
      currentWordCount = 0;
    }
  }

  // Handle remaining sentences
  if (currentSentences.length > 0) {
    const chunkContent = [...overlapSentences, ...currentSentences].join('. ') + '.';
    
    const { startTime, endTime } = words
      ? findChunkTimestamps(words, chunkContent, cleanedTranscript, currentPosition)
      : { startTime: null, endTime: null };

    chunks.push({
      content: cleanText(chunkContent),
      startTime,
      endTime,
      chunkIndex: chunks.length,
    });
  }

  return chunks;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Estimate the number of chunks that will be created
 * 
 * @param transcript - The transcript text
 * @returns Estimated number of chunks
 */
export function estimateChunkCount(transcript: string): number {
  const wordCount = countWords(transcript);
  if (wordCount <= MAX_CHUNK_SIZE) return 1;
  
  // Account for overlap
  const effectiveChunkSize = TARGET_CHUNK_SIZE - 100; // Rough overlap estimation
  return Math.ceil(wordCount / effectiveChunkSize);
}

/**
 * Get chunk statistics
 * 
 * @param chunks - Array of chunks
 * @returns Statistics about the chunks
 */
export function getChunkStats(chunks: Chunk[]): {
  totalChunks: number;
  avgWordsPerChunk: number;
  minWords: number;
  maxWords: number;
  hasTimestamps: boolean;
} {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      avgWordsPerChunk: 0,
      minWords: 0,
      maxWords: 0,
      hasTimestamps: false,
    };
  }

  const wordCounts = chunks.map((c) => countWords(c.content));
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  return {
    totalChunks: chunks.length,
    avgWordsPerChunk: Math.round(totalWords / chunks.length),
    minWords: Math.min(...wordCounts),
    maxWords: Math.max(...wordCounts),
    hasTimestamps: chunks.some((c) => c.startTime !== null),
  };
}
