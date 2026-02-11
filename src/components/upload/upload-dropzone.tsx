'use client';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
}

export function UploadDropzone({ onFileSelect: _onFileSelect, accept: _accept, maxSize: _maxSize }: UploadDropzoneProps) {
  return (
    <div className="border-2 border-dashed rounded-xl p-8 text-center">
      <p className="text-muted-foreground">Upload dropzone — Coming Soon</p>
    </div>
  );
}
