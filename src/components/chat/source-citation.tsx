/**
 * Source Citation Component
 * - Displays a single source reference from RAG
 * - Links to specific podcast/timestamp
 * - Shows relevant text snippet
 * - Similarity score indicator
 */

'use client';

import { Clock, ExternalLink } from 'lucide-react';
import { type ChatSource } from '@/types';
import { cn, formatSecondsToTimestamp, truncateText } from '@/lib/utils';

interface SourceCitationProps {
  source: ChatSource;
  onTimestampClick?: (podcastId: string, timestamp: number) => void;
}

export function SourceCitation({ source, onTimestampClick }: SourceCitationProps) {
  const similarityPercent = Math.round(source.similarity * 100);

  const handleTimestampClick = () => {
    if (source.start_time !== null && onTimestampClick) {
      onTimestampClick(source.podcast_id, source.start_time);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm hover:bg-muted/50 transition-colors">
      {/* Header: Podcast title and similarity */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <span className="line-clamp-1">{source.podcast_title}</span>
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
        </div>
        <SimilarityBadge percent={similarityPercent} />
      </div>

      {/* Timestamp */}
      {source.start_time !== null && (
        <button
          onClick={handleTimestampClick}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 mb-2 transition-colors"
        >
          <Clock className="h-3 w-3" />
          <span className="font-mono">{formatSecondsToTimestamp(source.start_time)}</span>
        </button>
      )}

      {/* Content snippet */}
      <p className="text-muted-foreground text-xs leading-relaxed">
        &ldquo;{truncateText(source.chunk_content, 180)}&rdquo;
      </p>
    </div>
  );
}

interface SimilarityBadgeProps {
  percent: number;
}

function SimilarityBadge({ percent }: SimilarityBadgeProps) {
  const getColorClass = () => {
    if (percent >= 85) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (percent >= 70) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  };

  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded text-xs font-medium shrink-0',
        getColorClass()
      )}
      title={`${percent}% match`}
    >
      {percent}%
    </span>
  );
}
