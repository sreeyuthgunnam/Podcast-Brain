/**
 * Chat Sources Component
 * - Expandable section showing source citations
 * - Displays podcast title, timestamp, and content snippet
 * - Collapsed by default
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Clock } from 'lucide-react';
import { type ChatSource } from '@/types';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn, formatSecondsToTimestamp, truncateText } from '@/lib/utils';

interface ChatSourcesProps {
  sources: ChatSource[];
}

export function ChatSources({ sources }: ChatSourcesProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <BookOpen className="h-4 w-4" />
        <span>{sources.length} source{sources.length > 1 ? 's' : ''}</span>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-2">
        {sources.map((source, index) => (
          <SourceCard key={index} source={source} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface SourceCardProps {
  source: ChatSource;
}

function SourceCard({ source }: SourceCardProps) {
  const similarityPercent = Math.round(source.similarity * 100);

  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
      {/* Header: Podcast title and timestamp */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-medium text-foreground line-clamp-1">
          {source.podcast_title}
        </div>
        <SimilarityBadge percent={similarityPercent} />
      </div>

      {/* Timestamp */}
      {source.start_time !== null && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Clock className="h-3 w-3" />
          <button
            className="hover:text-primary hover:underline transition-colors"
            onClick={() => {
              // Future: Navigate to timestamp in audio player
            }}
          >
            {formatSecondsToTimestamp(source.start_time)}
          </button>
        </div>
      )}

      {/* Content snippet */}
      <p className="text-muted-foreground text-xs leading-relaxed">
        {truncateText(source.chunk_content, 200)}
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
    >
      {percent}%
    </span>
  );
}
