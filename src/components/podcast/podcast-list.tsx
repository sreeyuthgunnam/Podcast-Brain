/**
 * Podcast List Component
 * - Grid/list layout of podcast cards
 * - Empty state when no podcasts
 * - Loading skeleton state
 * - Pagination controls
 */

'use client';

import { type Podcast } from '@/types';

interface PodcastListProps {
  podcasts: Podcast[];
  isLoading?: boolean;
}

export function PodcastList({ podcasts: _podcasts, isLoading: _isLoading }: PodcastListProps) {
  return (
    <div className="grid gap-4">
      <p className="text-gray-500">Podcast list - Coming Soon</p>
    </div>
  );
}
