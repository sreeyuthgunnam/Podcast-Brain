/**
 * Empty State Component
 * Reusable empty state display with icon, description, and action
 */

'use client';

import { type LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      )}

      {/* Action */}
      {action && (
        <>
          {action.href ? (
            <Link href={action.href}>
              <Button>{action.label}</Button>
            </Link>
          ) : action.onClick ? (
            <Button onClick={action.onClick}>{action.label}</Button>
          ) : null}
        </>
      )}
    </div>
  );
}

// ============================================================================
// Compact Empty State (smaller variant)
// ============================================================================

interface CompactEmptyStateProps {
  icon?: LucideIcon;
  message: string;
  className?: string;
}

export function CompactEmptyState({
  icon: Icon = Inbox,
  message,
  className,
}: CompactEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 py-8 px-4 text-muted-foreground',
        className
      )}
    >
      <Icon className="w-5 h-5" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
