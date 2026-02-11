'use client';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  onCancel?: () => void;
}

export function UploadProgress({ fileName: _fileName, progress: _progress, status: _status, onCancel: _onCancel }: UploadProgressProps) {
  return (
    <div className="border rounded-xl p-4">
      <p className="text-muted-foreground">Upload progress — Coming Soon</p>
    </div>
  );
}
