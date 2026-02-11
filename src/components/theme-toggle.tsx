'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full',
        'border border-border/50 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200',
        className
      )}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span
        className={cn(
          'pointer-events-none flex h-5 w-5 items-center justify-center rounded-full shadow-sm transition-transform duration-300',
          theme === 'dark'
            ? 'translate-x-[22px] bg-zinc-950'
            : 'translate-x-1 bg-white'
        )}
      >
        {theme === 'dark' ? (
          <Moon className="h-3 w-3 text-blue-400" />
        ) : (
          <Sun className="h-3 w-3 text-amber-500" />
        )}
      </span>
    </button>
  );
}
