/**
 * Podcast Uploader Component
 * 
 * Complete podcast upload experience with:
 * - Drag & drop zone
 * - File validation
 * - Form fields (title, description)
 * - Upload progress tracking
 * - Success/error states
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileAudio,
  X,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';
import { createClient } from '@/lib/supabase/client';
import {
  uploadPodcastAudio,
  validateAudioFile,
  getAudioDuration,
  formatFileSize,
  formatDuration,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
} from '@/lib/storage';
import { cn } from '@/lib/utils';
import type { Podcast } from '@/types';

// ============================================
// TYPES
// ============================================

type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

interface PodcastUploaderProps {
  onSuccess?: (podcast: Podcast) => void;
}

// ============================================
// PODCAST UPLOADER COMPONENT
// ============================================

export function PodcastUploader({ onSuccess }: PodcastUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // State
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  /**
   * Extract title from filename
   */
  const getTitleFromFilename = (filename: string): string => {
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[_-]/g, ' ') // Replace underscores/hyphens with spaces
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  /**
   * Handle file selection (from drop or browse)
   */
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError(null);

    // Validate file
    const validation = validateAudioFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setFile(selectedFile);
    setTitle(getTitleFromFilename(selectedFile.name));
    setState('selected');

    // Get duration in background
    try {
      const audioDuration = await getAudioDuration(selectedFile);
      setDuration(audioDuration);
    } catch (err) {
      console.warn('Could not determine duration:', err);
      // Not critical, continue without duration
    }
  }, []);

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  /**
   * Handle browse button click
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  /**
   * Clear selected file
   */
  const handleClearFile = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setDuration(null);
    setError(null);
    setState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle upload
   */
  const handleUpload = async () => {
    if (!file || !title.trim()) {
      setError('Please provide a title for your podcast');
      return;
    }

    setState('uploading');
    setProgress(0);
    setError(null);
    abortControllerRef.current = new AbortController();

    // Show loading toast
    const loadingToastId = showLoading('Uploading your podcast...');

    try {
      // Simulate progress for UX (actual upload doesn't report progress easily)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      // Get user ID from Supabase client
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Upload file to storage
      const { url, path } = await uploadPodcastAudio(file, user.id);
      
      clearInterval(progressInterval);
      setProgress(95);

      // Create podcast record in database
      const response = await fetch('/api/podcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          audio_url: url,
          audio_path: path,
          duration: duration,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create podcast');
      }

      const { data: podcast } = await response.json();
      
      setProgress(100);
      setState('success');

      // Dismiss loading toast and show success
      dismissToast(loadingToastId);
      showSuccess('Upload complete!', 'Your podcast is now being processed.');

      // Start transcription and then embedding (don't wait for it)
      // We need to chain these calls because Vercel serverless functions
      // can't do background work after returning a response
      (async () => {
        try {
          const transcribeRes = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ podcastId: podcast.id }),
          });
          
          if (transcribeRes.ok) {
            const transcribeData = await transcribeRes.json();
            
            // After transcription completes, call embed endpoint
            if (transcribeData.needsEmbedding) {
              await fetch('/api/embed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ podcastId: podcast.id }),
              });
            }
          }
        } catch (err) {
          console.error('Failed to process podcast:', err);
        }
      })();

      onSuccess?.(podcast);

      // Redirect to episode page after delay
      setTimeout(() => {
        router.push(`/episode/${podcast.id}`);
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setState('error');

      // Dismiss loading toast and show error
      dismissToast(loadingToastId);
      showError('Upload failed', err instanceof Error ? err.message : 'Please try again');
    }
  };

  /**
   * Handle cancel upload
   */
  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setState('selected');
    setProgress(0);
  };

  /**
   * Handle retry after error
   */
  const handleRetry = () => {
    setError(null);
    setState('selected');
  };

  // ============================================
  // RENDER: IDLE STATE (DROP ZONE)
  // ============================================

  if (state === 'idle') {
    return (
      <Card className="bg-gray-900/50 border-white/10">
        <CardContent className="p-0">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            className={cn(
              'relative cursor-pointer rounded-lg border-2 border-dashed transition-all duration-200',
              'flex flex-col items-center justify-center p-12',
              isDragOver
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-white/20 hover:border-purple-500/50 hover:bg-white/5'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors',
                isDragOver ? 'bg-purple-500/20' : 'bg-white/5'
              )}
            >
              <Upload
                className={cn(
                  'h-8 w-8 transition-colors',
                  isDragOver ? 'text-purple-400' : 'text-gray-400'
                )}
              />
            </div>

            <h3 className="text-lg font-medium text-white mb-2">
              Drag and drop your audio file here
            </h3>
            <p className="text-gray-400 mb-4">or click to browse</p>

            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
              <span>Accepted formats: {ALLOWED_EXTENSIONS.join(', ')}</span>
              <span>•</span>
              <span>Max size: {formatFileSize(MAX_FILE_SIZE)}</span>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================
  // RENDER: SELECTED STATE (FILE INFO + FORM)
  // ============================================

  if (state === 'selected' || state === 'error') {
    return (
      <Card className="bg-gray-900/50 border-white/10">
        <CardContent className="p-6 space-y-6">
          {/* File Info */}
          <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
              <FileAudio className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{file?.name}</p>
              <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                <span>{file ? formatFileSize(file.size) : ''}</span>
                {duration && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(duration)}</span>
                  </>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
              onClick={handleClearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Audio Preview */}
          {file && (
            <div className="p-4 rounded-lg bg-white/5">
              <audio
                controls
                className="w-full h-10"
                src={URL.createObjectURL(file)}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white">
                Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Episode title"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">
                Description <span className="text-gray-500">(optional)</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for your podcast episode..."
                rows={4}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClearFile}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            {state === 'error' ? (
              <Button
                onClick={handleRetry}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Try Again
              </Button>
            ) : (
              <Button
                onClick={handleUpload}
                disabled={!title.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Podcast
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================
  // RENDER: UPLOADING STATE
  // ============================================

  if (state === 'uploading') {
    return (
      <Card className="bg-gray-900/50 border-white/10">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* File Info */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Uploading...</p>
                <p className="text-sm text-gray-400">{file?.name}</p>
              </div>
              <span className="text-lg font-semibold text-purple-400">
                {progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <Progress value={progress} className="h-2 bg-white/10" />

            {/* Cancel Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-white/10 text-white hover:bg-white/5"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel Upload
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================
  // RENDER: SUCCESS STATE
  // ============================================

  if (state === 'success') {
    return (
      <Card className="bg-gray-900/50 border-white/10">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Upload Complete!
            </h3>
            <p className="text-gray-400 mb-6">
              Your podcast is now being transcribed. This may take a few minutes.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to episode page...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
