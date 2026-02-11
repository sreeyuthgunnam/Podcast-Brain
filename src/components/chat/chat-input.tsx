'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
  maxLength?: number;
}

const MAX_ROWS = 4;
const LINE_HEIGHT = 24; // Approximate line height in pixels

export function ChatInput({
  onSend,
  isLoading,
  placeholder = 'Ask anything about your podcasts...',
  maxLength = 2000,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate new height (capped at max rows)
    const maxHeight = LINE_HEIGHT * MAX_ROWS;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  const handleSubmit = () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isLoading) return;

    onSend(trimmedValue);
    setValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isOverLimit = value.length > maxLength;
  const showCharCount = value.length > maxLength * 0.8;

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end gap-2">
        {/* Textarea container */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl border bg-background px-4 py-3',
              'text-sm placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors',
              isOverLimit && 'border-destructive focus:ring-destructive/20'
            )}
            style={{
              lineHeight: `${LINE_HEIGHT}px`,
              maxHeight: `${LINE_HEIGHT * MAX_ROWS}px`,
            }}
          />

          {/* Character count */}
          {showCharCount && (
            <span
              className={cn(
                'absolute bottom-1 right-3 text-xs',
                isOverLimit ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {value.length}/{maxLength}
            </span>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading || isOverLimit}
          className={cn(
            'h-11 w-11 sm:h-11 sm:w-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center shrink-0',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 active:bg-primary/80 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus:ring-2 focus:ring-primary/20'
          )}
          title="Send message (Enter)"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Hint text - hidden on mobile */}
      <p className="hidden sm:block text-xs text-muted-foreground mt-2 text-center">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Enter</kbd> to send,{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Shift + Enter</kbd> for new line
      </p>
    </div>
  );
}
