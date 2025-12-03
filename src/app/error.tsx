/**
 * Global Error Boundary
 * Catches unhandled errors in the app and displays a friendly error state
 */

'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ErrorState
        title="Something went wrong"
        message={
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'An unexpected error occurred. Our team has been notified.'
        }
        onRetry={reset}
        showHome
      />
    </div>
  );
}
