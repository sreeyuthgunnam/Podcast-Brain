/**
 * TypeScript Type Definitions for Podcast Brain
 * 
 * This file contains all TypeScript types used throughout the application.
 * Types are organized into sections:
 * - Core Database Models (matching Supabase schema)
 * - Chat Types
 * - API Request/Response Types
 * - Supabase Database Type
 * - Utility Types
 */

// ============================================
// CORE DATABASE MODELS
// These types match the Supabase database schema
// ============================================

/**
 * User Profile
 * Extends Supabase auth.users with additional profile data
 * Stored in: public.users table
 */
export interface User {
  /** UUID from Supabase Auth */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name (optional) */
  full_name: string | null;
  /** URL to user's avatar image (optional) */
  avatar_url: string | null;
  /** ISO timestamp of account creation */
  created_at: string;
}

/**
 * Podcast Status
 * Represents the current processing state of a podcast
 */
export type PodcastStatus = 
  | 'uploading'     // File is being uploaded to storage
  | 'transcribing'  // Audio is being transcribed by AssemblyAI
  | 'processing'    // Generating embeddings and summary
  | 'ready'         // Fully processed and ready for chat
  | 'error';        // Something went wrong

/**
 * Podcast
 * Main podcast/episode entity
 * Stored in: public.podcasts table
 */
export interface Podcast {
  /** UUID primary key */
  id: string;
  /** Foreign key to users.id */
  user_id: string;
  /** Podcast episode title */
  title: string;
  /** Episode description (optional) */
  description: string | null;
  /** Supabase Storage URL for the audio file */
  audio_url: string;
  /** Original source URL if imported from RSS/URL (optional) */
  source_url: string | null;
  /** Duration in seconds (optional, populated after upload) */
  duration: number | null;
  /** Full transcript text (optional, populated after transcription) */
  transcript: string | null;
  /** AI-generated summary (optional, populated after processing) */
  summary: string | null;
  /** AI-extracted topics/tags */
  topics: string[];
  /** Current processing status */
  status: PodcastStatus;
  /** Error message if status is 'error' */
  error_message: string | null;
  /** ISO timestamp of creation */
  created_at: string;
  /** ISO timestamp of last update */
  updated_at: string;
}

/**
 * Podcast Chunk
 * A segment of transcript text with its embedding vector
 * Used for RAG (Retrieval Augmented Generation)
 * Stored in: public.podcast_chunks table (with pgvector)
 */
export interface PodcastChunk {
  /** UUID primary key */
  id: string;
  /** Foreign key to podcasts.id */
  podcast_id: string;
  /** The text content of this chunk */
  content: string;
  /** Start time in seconds (optional, for timestamp linking) */
  start_time: number | null;
  /** End time in seconds (optional) */
  end_time: number | null;
  /** Sequential index of this chunk within the podcast */
  chunk_index: number;
  /** OpenAI embedding vector (1536 dimensions for text-embedding-3-small) */
  embedding: number[] | null;
}

// ============================================
// CHAT TYPES
// Types for the RAG chat functionality
// ============================================

/**
 * Chat Message Role
 * Who sent the message
 */
export type ChatRole = 'user' | 'assistant';

/**
 * Chat Source
 * A reference to a podcast chunk used to generate a response
 * Provides citations for AI responses
 */
export interface ChatSource {
  /** The podcast this source came from */
  podcast_id: string;
  /** Title of the podcast (for display) */
  podcast_title: string;
  /** The actual text content from the chunk */
  chunk_content: string;
  /** Start time in seconds for linking to audio (optional) */
  start_time: number | null;
  /** Cosine similarity score (0-1, higher = more relevant) */
  similarity: number;
}

/**
 * Chat Message
 * A single message in a chat conversation
 * Stored in: public.chat_messages table
 */
export interface ChatMessage {
  /** UUID primary key */
  id: string;
  /** Foreign key to users.id */
  user_id: string;
  /** Foreign key to podcasts.id (null = chat across all podcasts) */
  podcast_id: string | null;
  /** Who sent this message */
  role: ChatRole;
  /** The message content */
  content: string;
  /** Source citations for assistant messages (null for user messages) */
  sources: ChatSource[] | null;
  /** ISO timestamp of when message was sent */
  created_at: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// Types for API route handlers
// ============================================

/**
 * Generic API Response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Paginated API Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Transcription Job Status
 * Tracks AssemblyAI transcription progress
 */
export interface TranscriptionJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  podcast_id: string;
}

/**
 * Chat API Request
 */
export interface ChatRequest {
  /** The user's message */
  message: string;
  /** Optional: limit chat to specific podcasts */
  podcast_ids?: string[];
  /** Optional: conversation history for context */
  history?: Pick<ChatMessage, 'role' | 'content'>[];
}

/**
 * Chat API Response
 */
export interface ChatResponse {
  /** The assistant's response */
  message: string;
  /** Source citations used to generate the response */
  sources: ChatSource[];
}

/**
 * Upload API Response
 */
export interface UploadResponse {
  podcast_id: string;
  audio_url: string;
}

/**
 * Embed API Request
 */
export interface EmbedRequest {
  podcast_id: string;
}

/**
 * Transcribe API Request
 */
export interface TranscribeRequest {
  podcast_id: string;
}

// ============================================
// SUPABASE DATABASE TYPE
// Type-safe database schema for Supabase client
// ============================================

/**
 * Database schema type for Supabase
 * Used with createClient<Database>() for type-safe queries
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<User> & { id: string; email: string };
        Update: Partial<User>;
        Relationships: [];
      };
      podcasts: {
        Row: Podcast;
        Insert: Partial<Podcast> & { user_id: string; title: string; audio_url: string };
        Update: Partial<Podcast>;
        Relationships: [
          {
            foreignKeyName: "podcasts_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      podcast_chunks: {
        Row: PodcastChunk;
        Insert: Partial<PodcastChunk> & { podcast_id: string; content: string; chunk_index: number };
        Update: Partial<PodcastChunk>;
        Relationships: [
          {
            foreignKeyName: "podcast_chunks_podcast_id_fkey";
            columns: ["podcast_id"];
            referencedRelation: "podcasts";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Partial<ChatMessage> & { user_id: string; role: ChatRole; content: string };
        Update: Partial<ChatMessage>;
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_chunks: {
        Args: {
          query_embedding: string;
          match_threshold: number;
          match_count: number;
          filter_user_id: string;
          filter_podcast_id: string | null;
        };
        Returns: {
          chunk_id: string;
          podcast_id: string;
          podcast_title: string;
          content: string;
          start_time: number | null;
          end_time: number | null;
          similarity: number;
        }[];
      };
    };
    Enums: {
      podcast_status: PodcastStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ============================================
// UTILITY TYPES
// Helper types used throughout the app
// ============================================

/**
 * Podcast with user relation
 */
export interface PodcastWithUser extends Podcast {
  user: Pick<User, 'id' | 'email' | 'full_name' | 'avatar_url'>;
}

/**
 * Chat message for UI (includes pending state)
 */
export interface ChatMessageUI extends Omit<ChatMessage, 'id' | 'user_id' | 'created_at'> {
  id: string;
  isStreaming?: boolean;
  isPending?: boolean;
}

/**
 * Podcast filter options
 */
export interface PodcastFilters {
  status?: PodcastStatus;
  search?: string;
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Upload progress state
 */
export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

/**
 * Transcript Segment
 * A segment of transcript with timing information
 */
export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  speaker?: string;
}

// ============================================
// SUPABASE HELPER TYPES
// Helper types for working with Supabase client
// ============================================

/**
 * Helper type to make Supabase queries more flexible
 * Use this when TypeScript inference doesn't work correctly
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseRecord = Record<string, any>;

/**
 * Cast Supabase data to a specific type
 */
export function asType<T>(data: unknown): T {
  return data as T;
}
