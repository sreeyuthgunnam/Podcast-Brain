'use client';

interface AudioPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
}

export function AudioPlayer({ src: _src, onTimeUpdate: _onTimeUpdate }: AudioPlayerProps) {
  return (
    <div className="bg-muted p-4 rounded-xl">
      <p className="text-muted-foreground">Audio player — Coming Soon</p>
    </div>
  );
}
