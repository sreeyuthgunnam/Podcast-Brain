'use client';

import { type TranscriptSegment } from '@/types';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  currentTime?: number;
  onSeek?: (time: number) => void;
}

export function TranscriptViewer({ segments: _segments, currentTime: _currentTime, onSeek: _onSeek }: TranscriptViewerProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Transcript viewer — Coming Soon</p>
    </div>
  );
}
