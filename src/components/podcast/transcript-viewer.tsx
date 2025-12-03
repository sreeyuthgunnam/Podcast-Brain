/**
 * Transcript Viewer Component
 * - Displays full transcript
 * - Timestamp markers (clickable to seek)
 * - Speaker labels (if available)
 * - Highlight current playing segment
 * - Search within transcript
 * - Copy text functionality
 */

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
      <p className="text-gray-500">Transcript viewer - Coming Soon</p>
    </div>
  );
}
