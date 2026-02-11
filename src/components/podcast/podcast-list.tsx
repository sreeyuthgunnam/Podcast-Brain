'use client';

import { type Podcast } from '@/types';

interface PodcastListProps {
  podcasts: Podcast[];
  isLoading?: boolean;
}

export function PodcastList({ podcasts: _podcasts, isLoading: _isLoading }: PodcastListProps) {
  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground">Podcast list — Coming Soon</p>
    </div>
  );
}
