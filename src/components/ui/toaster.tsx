/**
 * Toaster Component
 * Sonner-based toast notifications with custom styling
 */

'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast bg-background border-border shadow-lg rounded-lg p-4 flex items-start gap-3',
          title: 'text-foreground font-medium text-sm',
          description: 'text-muted-foreground text-sm',
          actionButton:
            'bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium',
          cancelButton:
            'bg-muted text-muted-foreground hover:bg-muted/80 rounded-md px-3 py-1.5 text-sm font-medium',
          success: 'border-green-500/50 [&>svg]:text-green-500',
          error: 'border-destructive/50 [&>svg]:text-destructive',
          loading: 'border-primary/50 [&>svg]:text-primary',
          info: 'border-blue-500/50 [&>svg]:text-blue-500',
          warning: 'border-yellow-500/50 [&>svg]:text-yellow-500',
        },
      }}
      closeButton
      richColors
      expand
    />
  );
}
