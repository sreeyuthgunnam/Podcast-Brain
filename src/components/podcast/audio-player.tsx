/**
 * Audio Player Component
 * - Play/pause button
 * - Progress bar with seek
 * - Volume control
 * - Playback speed selector
 * - Current time / duration display
 * - Sync with transcript highlighting
 */

'use client';

interface AudioPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
}

export function AudioPlayer({ src: _src, onTimeUpdate: _onTimeUpdate }: AudioPlayerProps) {
  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <p className="text-gray-500">Audio player - Coming Soon</p>
    </div>
  );
}
