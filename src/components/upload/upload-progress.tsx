/**
 * Upload Progress Component
 * - Shows upload progress bar
 * - File name and size
 * - Cancel button
 * - Status indicators (uploading, processing, complete)
 */

'use client';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  onCancel?: () => void;
}

export function UploadProgress({ fileName: _fileName, progress: _progress, status: _status, onCancel: _onCancel }: UploadProgressProps) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-gray-500">Upload progress - Coming Soon</p>
    </div>
  );
}
