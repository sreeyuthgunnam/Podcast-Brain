'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreVertical,
  Eye,
  Trash2,
  Clock,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn, formatRelativeTime, truncateText } from '@/lib/utils';
import type { Podcast, PodcastStatus } from '@/types';

interface PodcastCardProps {
  podcast: Podcast;
  onDelete?: (id: string) => void;
}

function getTitleGradient(title: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }

  // Predefined gradient combinations
  const gradients = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-teal-500 to-green-500',
    'from-rose-500 to-orange-500',
    'from-violet-500 to-indigo-500',
  ];

  return gradients[Math.abs(hash) % gradients.length];
}

function formatDurationHuman(seconds: number | null): string {
  if (!seconds) return '';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

function getStatusConfig(status: PodcastStatus): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  showLoader?: boolean;
} {
  switch (status) {
    case 'uploading':
      return { label: 'Uploading...', variant: 'warning', showLoader: true };
    case 'transcribing':
      return { label: 'Transcribing...', variant: 'info', showLoader: true };
    case 'processing':
      return { label: 'Processing...', variant: 'info', showLoader: true };
    case 'ready':
      return { label: 'Ready', variant: 'success' };
    case 'error':
      return { label: 'Error', variant: 'destructive' };
    default:
      return { label: status, variant: 'secondary' };
  }
}

export function PodcastCard({ podcast, onDelete }: PodcastCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusConfig = getStatusConfig(podcast.status);
  const gradient = getTitleGradient(podcast.title);

  const handleCardClick = () => {
    router.push(`/episode/${podcast.id}`);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/episode/${podcast.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(podcast.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Limit topics to 3
  const displayTopics = podcast.topics?.slice(0, 3) || [];
  const remainingTopics = (podcast.topics?.length || 0) - 3;

  return (
    <>
      <Card
        onClick={handleCardClick}
        className={cn(
          'group cursor-pointer overflow-hidden transition-all duration-200',
          'hover:shadow-lg hover:-translate-y-1',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
        tabIndex={0}
        role="article"
        aria-label={`Podcast: ${podcast.title}`}
      >
        {/* Gradient Thumbnail */}
        <div
          className={cn(
            'relative h-32 bg-gradient-to-br',
            gradient
          )}
        >
          {/* Waveform Pattern Overlay */}
          <div className="absolute inset-0 opacity-20">
            <svg
              className="w-full h-full"
              viewBox="0 0 200 100"
              preserveAspectRatio="none"
            >
              {[...Array(20)].map((_, i) => {
                const height = 20 + Math.sin(i * 0.5) * 30 + Math.random() * 20;
                return (
                  <rect
                    key={i}
                    x={i * 10 + 2}
                    y={(100 - height) / 2}
                    width={6}
                    height={height}
                    fill="white"
                    rx={3}
                  />
                );
              })}
            </svg>
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant={statusConfig.variant} className="shadow-sm">
              {statusConfig.showLoader && (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              )}
              {statusConfig.label}
            </Badge>
          </div>

          {/* Three-dot Menu */}
          <div className="absolute top-3 right-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'p-2 rounded-md bg-black/20 text-white min-w-[44px] min-h-[44px] flex items-center justify-center',
                    'hover:bg-black/40 active:bg-black/50 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-white/50'
                  )}
                  aria-label="Podcast options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[150px]">
                <DropdownMenuItem onClick={handleView} className="min-h-[44px]">
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="text-destructive focus:text-destructive min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          {/* Title */}
          <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {podcast.title}
          </h3>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            {podcast.duration && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDurationHuman(podcast.duration)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatRelativeTime(podcast.created_at)}</span>
            </div>
          </div>

          {/* Description preview */}
          {podcast.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {truncateText(podcast.description, 100)}
            </p>
          )}

          {/* Topics */}
          {displayTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displayTopics.map((topic, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {topic}
                </Badge>
              ))}
              {remainingTopics > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{remainingTopics} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
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
              onClick={handleConfirmDelete}
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
    </>
  );
}
