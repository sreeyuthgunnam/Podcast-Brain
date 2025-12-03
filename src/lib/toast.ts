/**
 * Toast Notification Helpers
 * Wrapper functions for Sonner toast notifications
 */

import { toast } from 'sonner';

/**
 * Show a success toast notification
 * @param message - Main message to display
 * @param description - Optional description text
 */
export function showSuccess(message: string, description?: string): void {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

/**
 * Show an error toast notification
 * @param message - Main error message
 * @param description - Optional error details
 */
export function showError(message: string, description?: string): void {
  toast.error(message, {
    description,
    duration: 5000,
  });
}

/**
 * Show an info toast notification
 * @param message - Main message to display
 * @param description - Optional description text
 */
export function showInfo(message: string, description?: string): void {
  toast.info(message, {
    description,
    duration: 4000,
  });
}

/**
 * Show a warning toast notification
 * @param message - Main warning message
 * @param description - Optional warning details
 */
export function showWarning(message: string, description?: string): void {
  toast.warning(message, {
    description,
    duration: 4000,
  });
}

/**
 * Show a loading toast notification with spinner
 * @param message - Loading message to display
 * @returns Toast ID for dismissing later
 */
export function showLoading(message: string): string | number {
  return toast.loading(message, {
    duration: Infinity, // Don't auto-dismiss
  });
}

/**
 * Dismiss a specific toast by ID
 * @param id - Toast ID returned from showLoading
 */
export function dismissToast(id: string | number): void {
  toast.dismiss(id);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts(): void {
  toast.dismiss();
}

/**
 * Show a promise-based toast that updates based on promise state
 * @param promise - Promise to track
 * @param messages - Messages for loading, success, and error states
 * @returns The original promise result
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
): Promise<T> {
  toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
  return promise;
}

// Re-export toast for advanced usage
export { toast };
