/**
 * AssemblyAI Integration
 * 
 * Handles podcast transcription with AssemblyAI:
 * - Transcription with speaker labels
 * - Auto-generated chapters and summaries
 * - Word-level timestamps
 */

import { AssemblyAI } from 'assemblyai';
import type {
  TranscriptWord,
  TranscriptUtterance,
  Chapter,
} from 'assemblyai';

// ============================================
// CLIENT INITIALIZATION (LAZY)
// ============================================

let _client: AssemblyAI | null = null;

/**
 * Get AssemblyAI client instance (lazy initialization)
 * This prevents errors during build time when env vars aren't available
 */
function getAssemblyAIClient(): AssemblyAI {
  if (!_client) {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      throw new Error('ASSEMBLYAI_API_KEY environment variable is not set');
    }
    _client = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY,
    });
  }
  return _client;
}

// ============================================
// TYPES
// ============================================

/**
 * Word with timestamp information
 */
export interface TranscriptWordResult {
  /** The transcribed word */
  text: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Speaker-separated utterance
 */
export interface TranscriptUtteranceResult {
  /** Speaker identifier (e.g., "A", "B") */
  speaker: string;
  /** The spoken text */
  text: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
}

/**
 * Auto-generated chapter
 */
export interface TranscriptChapter {
  /** Chapter headline/title */
  headline: string;
  /** Chapter summary */
  summary: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
}

/**
 * Complete transcription result
 */
export interface TranscriptResult {
  /** Full transcript text */
  text: string;
  /** Word-level timestamps */
  words: TranscriptWordResult[];
  /** Speaker-separated segments (if speaker labels enabled) */
  utterances?: TranscriptUtteranceResult[];
  /** Auto-generated summary */
  summary?: string;
  /** Auto-generated chapters */
  chapters?: TranscriptChapter[];
  /** AssemblyAI transcript ID (for reference) */
  transcriptId: string;
  /** Audio duration in seconds */
  audioDuration?: number;
}

/**
 * Transcription job status
 */
export interface TranscriptStatus {
  /** Current status */
  status: 'queued' | 'processing' | 'completed' | 'error';
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Transcription error
 */
export class TranscriptionError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly transcriptId?: string
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert milliseconds to seconds
 */
function msToSeconds(ms: number): number {
  return Math.round((ms / 1000) * 100) / 100; // Round to 2 decimal places
}

/**
 * Transform AssemblyAI words to our format
 */
function transformWords(words: TranscriptWord[] | null): TranscriptWordResult[] {
  if (!words) return [];
  
  return words.map((word) => ({
    text: word.text,
    start: msToSeconds(word.start),
    end: msToSeconds(word.end),
    confidence: word.confidence,
  }));
}

/**
 * Transform AssemblyAI utterances to our format
 */
function transformUtterances(
  utterances: TranscriptUtterance[] | null
): TranscriptUtteranceResult[] | undefined {
  if (!utterances || utterances.length === 0) return undefined;
  
  return utterances.map((utterance) => ({
    speaker: utterance.speaker,
    text: utterance.text,
    start: msToSeconds(utterance.start),
    end: msToSeconds(utterance.end),
  }));
}

/**
 * Transform AssemblyAI chapters to our format
 */
function transformChapters(
  chapters: Chapter[] | null
): TranscriptChapter[] | undefined {
  if (!chapters || chapters.length === 0) return undefined;
  
  return chapters.map((chapter) => ({
    headline: chapter.headline,
    summary: chapter.summary,
    start: msToSeconds(chapter.start),
    end: msToSeconds(chapter.end),
  }));
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Transcribe a podcast audio file
 * 
 * @param audioUrl - Public URL of the audio file
 * @returns Promise with structured transcript result
 * @throws TranscriptionError if transcription fails
 * 
 * @example
 * ```ts
 * const result = await transcribePodcast('https://example.com/podcast.mp3');
 * console.log(result.text);
 * console.log(result.chapters);
 * ```
 */
export async function transcribePodcast(
  audioUrl: string
): Promise<TranscriptResult> {
  try {
    console.log('Starting transcription for:', audioUrl);

    // Configure transcription with all features
    const transcript = await getAssemblyAIClient().transcripts.transcribe({
      audio_url: audioUrl,
      // Text formatting
      punctuate: true,
      format_text: true,
      // Speaker detection
      speaker_labels: true,
      // Summary (note: auto_chapters conflicts with summarization)
      summarization: true,
      summary_model: 'informative',
      summary_type: 'bullets',
    });

    // Check for errors
    if (transcript.status === 'error') {
      throw new TranscriptionError(
        transcript.error || 'Transcription failed',
        'TRANSCRIPTION_ERROR',
        transcript.id
      );
    }

    // Ensure we have text
    if (!transcript.text) {
      throw new TranscriptionError(
        'No transcript text generated',
        'NO_TEXT',
        transcript.id
      );
    }

    console.log('Transcription completed:', transcript.id);

    // Transform and return result
    return {
      text: transcript.text,
      words: transformWords(transcript.words ?? null),
      utterances: transformUtterances(transcript.utterances ?? null),
      summary: transcript.summary || undefined,
      chapters: transformChapters(transcript.chapters ?? null),
      transcriptId: transcript.id,
      audioDuration: transcript.audio_duration
        ? msToSeconds(transcript.audio_duration * 1000) // audio_duration is in seconds
        : undefined,
    };
  } catch (error) {
    console.error('Transcription error:', error);

    if (error instanceof TranscriptionError) {
      throw error;
    }

    // Handle specific AssemblyAI errors
    if (error instanceof Error) {
      // Check for common error patterns
      if (error.message.includes('Invalid audio URL')) {
        throw new TranscriptionError(
          'Invalid audio URL. Please ensure the URL is accessible.',
          'INVALID_URL'
        );
      }
      if (error.message.includes('timeout')) {
        throw new TranscriptionError(
          'Transcription timed out. The audio file may be too long.',
          'TIMEOUT'
        );
      }
      throw new TranscriptionError(error.message, 'UNKNOWN_ERROR');
    }

    throw new TranscriptionError(
      'An unexpected error occurred during transcription',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Get the status of a transcription job
 * 
 * @param transcriptId - The AssemblyAI transcript ID
 * @returns Promise with current status
 * 
 * @example
 * ```ts
 * const status = await getTranscriptStatus('abc123');
 * if (status.status === 'completed') {
 *   console.log('Transcription ready!');
 * }
 * ```
 */
export async function getTranscriptStatus(
  transcriptId: string
): Promise<TranscriptStatus> {
  try {
    const transcript = await getAssemblyAIClient().transcripts.get(transcriptId);

    // Map AssemblyAI status to our status
    const statusMap: Record<string, TranscriptStatus['status']> = {
      queued: 'queued',
      processing: 'processing',
      completed: 'completed',
      error: 'error',
    };

    const status = statusMap[transcript.status] || 'processing';

    return {
      status,
      error: transcript.status === 'error' ? transcript.error || undefined : undefined,
    };
  } catch (error) {
    console.error('Get transcript status error:', error);
    
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to get status',
    };
  }
}

/**
 * Get a completed transcript by ID
 * 
 * @param transcriptId - The AssemblyAI transcript ID
 * @returns Promise with transcript result or null if not ready
 * 
 * @example
 * ```ts
 * const result = await getTranscript('abc123');
 * if (result) {
 *   console.log(result.text);
 * }
 * ```
 */
export async function getTranscript(
  transcriptId: string
): Promise<TranscriptResult | null> {
  try {
    const transcript = await getAssemblyAIClient().transcripts.get(transcriptId);

    if (transcript.status !== 'completed' || !transcript.text) {
      return null;
    }

    return {
      text: transcript.text,
      words: transformWords(transcript.words ?? null),
      utterances: transformUtterances(transcript.utterances ?? null),
      summary: transcript.summary || undefined,
      chapters: transformChapters(transcript.chapters ?? null),
      transcriptId: transcript.id,
      audioDuration: transcript.audio_duration || undefined,
    };
  } catch (error) {
    console.error('Get transcript error:', error);
    return null;
  }
}

/**
 * Start a transcription job without waiting for completion
 * 
 * Useful for async processing with webhooks
 * 
 * @param audioUrl - Public URL of the audio file
 * @returns Promise with transcript ID
 */
export async function startTranscription(audioUrl: string): Promise<string> {
  try {
    const transcript = await getAssemblyAIClient().transcripts.submit({
      audio_url: audioUrl,
      punctuate: true,
      format_text: true,
      speaker_labels: true,
      // Note: auto_chapters conflicts with summarization
      summarization: true,
      summary_model: 'informative',
      summary_type: 'bullets',
    });

    return transcript.id;
  } catch (error) {
    console.error('Start transcription error:', error);
    throw new TranscriptionError(
      error instanceof Error ? error.message : 'Failed to start transcription',
      'START_ERROR'
    );
  }
}

// Export client getter for advanced use cases
export { getAssemblyAIClient as assemblyai };
