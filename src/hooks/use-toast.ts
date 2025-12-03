/**
 * useToast Hook
 * Wrapper around Sonner toast for React components
 */

'use client';

import { toast } from 'sonner';
import {
  showSuccess,
  showError,
  showInfo,
  showWarning,
  showLoading,
  dismissToast,
  showPromise,
} from '@/lib/toast';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

/**
 * useToast hook for backward compatibility and convenience
 */
export function useToast() {
  const toastFn = (options: ToastOptions) => {
    if (options.variant === 'destructive') {
      showError(options.title || '', options.description);
    } else {
      showSuccess(options.title || '', options.description);
    }
  };

  return {
    toast: toastFn,
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    loading: showLoading,
    dismiss: dismissToast,
    promise: showPromise,
  };
}

// Re-export for direct usage
export { toast, showSuccess, showError, showInfo, showWarning, showLoading, dismissToast, showPromise };
