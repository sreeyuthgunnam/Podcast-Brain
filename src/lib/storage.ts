/**
 * Supabase Storage Helper Functions
 * 
 * Utilities for managing podcast audio files in Supabase Storage:
 * - Upload/delete audio files
 * - Get audio duration
 * - Validate files
 * - Format utilities
 */

import { createClient } from '@/lib/supabase/client';

// ============================================
// CONSTANTS
// ============================================

/** Maximum file size: 100MB */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/** Allowed audio MIME types */
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',      // .mp3
  'audio/mp3',       // .mp3 (alternative)
  'audio/wav',       // .wav
  'audio/wave',      // .wav (alternative)
  'audio/x-wav',     // .wav (alternative)
  'audio/mp4',       // .m4a
  'audio/x-m4a',     // .m4a (alternative)
  'audio/ogg',       // .ogg
  'audio/webm',      // .webm
];

/** Allowed file extensions */
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'];

/** Storage bucket name */
const BUCKET_NAME = 'podcast-audio';

// ============================================
// TYPES
// ============================================

export interface UploadResult {
  /** Public URL of the uploaded file */
  url: string;
  /** Storage path (for deletion) */
  path: string;
}

export interface ValidationResult {
  /** Whether the file is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

// ============================================
// UPLOAD FUNCTIONS
// ============================================

/**
 * Upload a podcast audio file to Supabase Storage
 * 
 * @param file - The audio file to upload
 * @param userId - The user's ID (for organizing files)
 * @returns Promise with the public URL and storage path
 * @throws Error if upload fails
 * 
 * @example
 * ```ts
 * const { url, path } = await uploadPodcastAudio(file, userId);
 * console.log('Uploaded to:', url);
 * ```
 */
export async function uploadPodcastAudio(
  file: File,
  userId: string
): Promise<UploadResult> {
  const supabase = createClient();

  // Generate unique filename: {userId}/{timestamp}_{filename}
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${userId}/${timestamp}_${sanitizedFilename}`;

  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Delete a podcast audio file from Supabase Storage
 * 
 * @param path - The storage path of the file to delete
 * @throws Error if deletion fails
 * 
 * @example
 * ```ts
 * await deletePodcastAudio('user123/1234567890_episode.mp3');
 * ```
 */
export async function deletePodcastAudio(path: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

// ============================================
// AUDIO ANALYSIS FUNCTIONS
// ============================================

/**
 * Get the duration of an audio file using Web Audio API
 * 
 * @param file - The audio file to analyze
 * @returns Promise with duration in seconds
 * @throws Error if duration cannot be determined
 * 
 * @example
 * ```ts
 * const duration = await getAudioDuration(file);
 * console.log(`Duration: ${duration} seconds`);
 * ```
 */
export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    // Create an audio element
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(objectUrl);
      
      if (audio.duration === Infinity || isNaN(audio.duration)) {
        reject(new Error('Could not determine audio duration'));
        return;
      }
      
      resolve(Math.round(audio.duration));
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load audio file'));
    });

    audio.src = objectUrl;
  });
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate an audio file for upload
 * 
 * Checks:
 * - File type (mp3, wav, m4a, ogg, webm)
 * - File size (max 100MB)
 * 
 * @param file - The file to validate
 * @returns Validation result with valid flag and optional error
 * 
 * @example
 * ```ts
 * const result = validateAudioFile(file);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateAudioFile(file: File): ValidationResult {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${formatFileSize(MAX_FILE_SIZE)}. Your file is ${formatFileSize(file.size)}.`,
    };
  }

  // Check MIME type
  const isValidMimeType = ALLOWED_MIME_TYPES.includes(file.type);
  
  // Also check extension as fallback (some browsers report incorrect MIME types)
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);

  if (!isValidMimeType && !isValidExtension) {
    return {
      valid: false,
      error: `Invalid file type. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true };
}

// ============================================
// FORMATTING FUNCTIONS
// ============================================

/**
 * Format bytes to human-readable string
 * 
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "45.2 MB")
 * 
 * @example
 * ```ts
 * formatFileSize(47185920) // "45.0 MB"
 * formatFileSize(1024)     // "1.0 KB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format seconds to human-readable duration
 * 
 * @param seconds - Duration in seconds
 * @param format - 'long' for "1h 23m 45s" or 'short' for "1:23:45"
 * @returns Formatted duration string
 * 
 * @example
 * ```ts
 * formatDuration(5025)           // "1h 23m 45s"
 * formatDuration(5025, 'short')  // "1:23:45"
 * formatDuration(145)            // "2m 25s"
 * formatDuration(145, 'short')   // "2:25"
 * ```
 */
export function formatDuration(
  seconds: number,
  format: 'long' | 'short' = 'long'
): string {
  if (seconds < 0 || !isFinite(seconds)) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (format === 'short') {
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Long format
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

// ============================================
// UTILITY EXPORTS
// ============================================

export { MAX_FILE_SIZE, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, BUCKET_NAME };
