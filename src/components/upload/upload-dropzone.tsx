/**
 * Upload Dropzone Component
 * - Drag and drop file upload
 * - Click to browse files
 * - File type validation (audio only)
 * - File size validation
 * - Visual feedback on drag over
 */

'use client';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
}

export function UploadDropzone({ onFileSelect: _onFileSelect, accept: _accept, maxSize: _maxSize }: UploadDropzoneProps) {
  return (
    <div className="border-2 border-dashed rounded-lg p-8 text-center">
      <p className="text-gray-500">Upload dropzone - Coming Soon</p>
    </div>
  );
}
