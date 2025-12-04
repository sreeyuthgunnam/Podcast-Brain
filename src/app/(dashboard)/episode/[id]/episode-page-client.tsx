/**
 * Episode Page Client Component
 * - Two-column layout (desktop) / Tabbed (mobile)
 * - Overview, Transcript, and Chat tabs
 * - Processing status display
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Calendar,
  Database,
  Search,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  MessageSquare,
  FileText,
  LayoutList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChatContainer } from '@/components/chat';
import { ProcessingStatus } from '@/components/podcast/processing-status';
import { showSuccess, showError, showInfo, showLoading, dismissToast } from '@/lib/toast';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Podcast, PodcastStatus } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface EpisodePageClientProps {
  podcast: Podcast;
  chunkCount: number;
}

type TabType = 'overview' | 'transcript' | 'chat';

// ============================================================================
// Utility Functions
// ============================================================================

function formatDurationLong(seconds: number | null): string {
  if (!seconds) return 'Unknown duration';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function getStatusConfig(status: PodcastStatus): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
} {
  switch (status) {
    case 'uploading':
      return { label: 'Uploading', variant: 'warning' };
    case 'transcribing':
      return { label: 'Transcribing', variant: 'info' };
    case 'processing':
      return { label: 'Processing', variant: 'info' };
    case 'ready':
      return { label: 'Ready', variant: 'success' };
    case 'error':
      return { label: 'Error', variant: 'destructive' };
    default:
      return { label: status, variant: 'secondary' };
  }
}

// ============================================================================
// Component
// ============================================================================

export function EpisodePageClient({ podcast: initialPodcast, chunkCount: initialChunkCount }: EpisodePageClientProps) {
  const router = useRouter();
  const [podcast, setPodcast] = useState<Podcast>(initialPodcast);
  const [chunkCount, setChunkCount] = useState(initialChunkCount);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const isReady = podcast.status === 'ready';
  const isProcessing = ['uploading', 'transcribing', 'processing'].includes(podcast.status);
  const isError = podcast.status === 'error';
  const statusConfig = getStatusConfig(podcast.status);

  // Poll for status updates when processing
  const fetchPodcastStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/podcasts/${podcast.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setPodcast(result.data);
          if (result.data.chunks_count !== undefined) {
            setChunkCount(result.data.chunks_count);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch podcast status:', error);
    }
  }, [podcast.id]);

  useEffect(() => {
    // Poll every 3 seconds while processing
    if (isProcessing) {
      const interval = setInterval(fetchPodcastStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isProcessing, fetchPodcastStatus]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/podcasts/${podcast.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess('Podcast deleted', 'The podcast has been permanently removed.');
        router.push('/library');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showError('Failed to delete podcast', 'Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleReprocess = async () => {
    setIsReprocessing(true);
    const loadingToastId = showLoading('Starting reprocessing...');
    
    try {
      // Start transcription again
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podcastId: podcast.id }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // After transcription, call embed endpoint to complete indexing
        if (data.needsEmbedding) {
          dismissToast(loadingToastId);
          const embedToastId = showLoading('Indexing for search...');
          
          try {
            await fetch('/api/embed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ podcastId: podcast.id }),
            });
            dismissToast(embedToastId);
          } catch {
            dismissToast(embedToastId);
            // Embedding failed but transcription succeeded - still show success
          }
        } else {
          dismissToast(loadingToastId);
        }
        
        showInfo('Processing complete', 'Your podcast has been processed.');
        router.refresh();
      } else {
        throw new Error('Failed to reprocess');
      }
    } catch (error) {
      console.error('Reprocess error:', error);
      dismissToast(loadingToastId);
      showError('Failed to reprocess', 'Please try again.');
    } finally {
      setIsReprocessing(false);
    }
  };

  // Mobile tabs (show chat tab only on mobile)
  const tabs: { id: TabType; label: string; icon: React.ElementType; hideOnProcessing?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutList },
    { id: 'transcript', label: 'Transcript', icon: FileText, hideOnProcessing: true },
    { id: 'chat', label: 'Chat', icon: MessageSquare, hideOnProcessing: true },
  ];

  const visibleTabs = tabs.filter((tab) => !tab.hideOnProcessing || isReady);

  return (
    <div className="min-h-screen">
      {/* Back Button */}
      <Link
        href="/library"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors py-2 -my-2 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </Link>

      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-wrap items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex-1 leading-tight">{podcast.title}</h1>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          {podcast.duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{formatDurationLong(podcast.duration)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Uploaded {formatRelativeTime(podcast.created_at)}</span>
          </div>
          {chunkCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{chunkCount} chunks indexed</span>
            </div>
          )}
        </div>

        {/* Topics */}
        {podcast.topics && podcast.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {podcast.topics.map((topic, index) => (
              <Badge key={index} variant="secondary">
                {topic}
              </Badge>
            ))}
          </div>
        )}
        {isProcessing && (
          <p className="text-sm text-muted-foreground mt-4">
            Topics will appear when processing completes...
          </p>
        )}
      </div>

      {/* Processing State */}
      {isProcessing && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <ProcessingStatus
              status={podcast.status}
              onRetry={handleReprocess}
              podcastId={podcast.id}
              updatedAt={podcast.updated_at}
            />
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">Processing Failed</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {podcast.error_message || 'An error occurred while processing this podcast.'}
                </p>
                <Button
                  onClick={handleReprocess}
                  disabled={isReprocessing}
                  variant="outline"
                >
                  {isReprocessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Reprocessing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column / Main Content */}
        <div className="flex-1 lg:w-[65%]">
          {/* Mobile Tabs */}
          <div className="flex gap-1 mb-4 lg:hidden overflow-x-auto pb-2 -mx-1 px-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]',
                  'active:opacity-80',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Desktop Tabs */}
          <div className="hidden lg:flex gap-1 mb-4 border-b">
            {visibleTabs.filter((t) => t.id !== 'chat').map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors min-h-[44px]',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <OverviewTab
              podcast={podcast}
              onDelete={() => setShowDeleteDialog(true)}
              onReprocess={handleReprocess}
              isReprocessing={isReprocessing}
            />
          )}

          {activeTab === 'transcript' && isReady && (
            <TranscriptTab transcript={podcast.transcript} />
          )}

          {activeTab === 'chat' && isReady && (
            <div className="lg:hidden h-[60vh] sm:h-[500px] border rounded-xl overflow-hidden">
              <ChatContainer podcastId={podcast.id} />
            </div>
          )}
        </div>

        {/* Right Column / Chat Sidebar (Desktop Only) */}
        {isReady && (
          <div className="hidden lg:block lg:w-[35%]">
            <Card className="sticky top-4 h-[calc(100vh-200px)] overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Chat with this episode
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-60px)]">
                <ChatContainer podcastId={podcast.id} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Podcast</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{podcast.title}&rdquo;? This action
              cannot be undone. All associated data including transcripts and
              chat history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface OverviewTabProps {
  podcast: Podcast;
  onDelete: () => void;
  onReprocess: () => void;
  isReprocessing: boolean;
}

function OverviewTab({ podcast, onDelete, onReprocess, isReprocessing }: OverviewTabProps) {
  const isReady = podcast.status === 'ready';
  const isError = podcast.status === 'error';

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {podcast.summary ? (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {podcast.summary}
            </p>
          ) : (
            <p className="text-muted-foreground italic">
              {isReady
                ? 'No summary available for this podcast.'
                : 'Summary will appear when processing completes...'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {podcast.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {podcast.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Audio Player Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Player</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
            Audio player coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {isError && (
            <Button
              onClick={onReprocess}
              disabled={isReprocessing}
              variant="outline"
            >
              {isReprocessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reprocessing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reprocess
                </>
              )}
            </Button>
          )}
          <Button onClick={onDelete} variant="destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Podcast
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface TranscriptTabProps {
  transcript: string | null;
}

function TranscriptTab({ transcript }: TranscriptTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTimestamp, setCopiedTimestamp] = useState<string | null>(null);

  if (!transcript) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No transcript available.</p>
        </CardContent>
      </Card>
    );
  }

  // Split transcript into lines and highlight search matches
  const lines = transcript.split('\n');
  const filteredLines = searchQuery
    ? lines.filter((line) =>
        line.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : lines;

  const handleCopyTimestamp = (timestamp: string) => {
    navigator.clipboard.writeText(timestamp);
    setCopiedTimestamp(timestamp);
    setTimeout(() => setCopiedTimestamp(null), 2000);
  };

  // Simple timestamp pattern: [00:00] or (00:00) or 00:00:00
  const timestampRegex = /\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?/g;

  const renderLineWithTimestamps = (line: string, index: number) => {
    const parts = line.split(timestampRegex);

    return (
      <p key={index} className="py-1 leading-relaxed">
        {parts.map((part, partIndex) => {
          // Check if this part matches timestamp format
          if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(part)) {
            const isCopied = copiedTimestamp === part;
            return (
              <button
                key={partIndex}
                onClick={() => handleCopyTimestamp(part)}
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono',
                  'bg-primary/10 text-primary hover:bg-primary/20 transition-colors'
                )}
                title="Click to copy"
              >
                {part}
                {isCopied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3 opacity-50" />
                )}
              </button>
            );
          }

          // Highlight search matches
          if (searchQuery && part.toLowerCase().includes(searchQuery.toLowerCase())) {
            const regex = new RegExp(`(${searchQuery})`, 'gi');
            const highlighted = part.split(regex);
            return (
              <span key={partIndex}>
                {highlighted.map((segment, segIndex) =>
                  segment.toLowerCase() === searchQuery.toLowerCase() ? (
                    <mark key={segIndex} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
                      {segment}
                    </mark>
                  ) : (
                    segment
                  )
                )}
              </span>
            );
          }

          return <span key={partIndex}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <CardTitle className="flex-1">Transcript</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'pl-10 pr-4 py-2 rounded-lg border bg-background text-sm w-full sm:w-64',
                'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
              )}
            />
          </div>
        </div>
        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            Found {filteredLines.length} matching line{filteredLines.length !== 1 ? 's' : ''}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="max-h-[600px] overflow-y-auto text-sm text-muted-foreground">
          {filteredLines.length > 0 ? (
            filteredLines.map((line, index) => renderLineWithTimestamps(line, index))
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No matches found for &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
