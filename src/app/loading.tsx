/**
 * Global Loading State
 * Displayed during route transitions
 */

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <Loader2 className="w-12 h-12 text-primary animate-spin" />

        {/* Text */}
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}
