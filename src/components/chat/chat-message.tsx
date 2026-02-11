'use client';

import { useState } from 'react';
import { User, Bot, Copy, Check } from 'lucide-react';
import { type ChatMessage as ChatMessageType } from '@/types';
import { ChatSources } from './chat-sources';
import { cn, formatRelativeTime } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div
      className={cn(
        'group flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-primary/10 text-primary'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'flex flex-col max-w-[85%] sm:max-w-[75%] lg:max-w-[70%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'relative px-4 py-3 rounded-2xl',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          )}
        >
          {/* Message content with markdown support */}
          <div
            className={cn(
              'text-sm sm:text-base leading-relaxed prose prose-sm max-w-none',
              'prose-p:my-1.5 prose-li:my-0.5',
              isUser
                ? 'prose-invert'
                : 'prose-neutral dark:prose-invert'
            )}
          >
            <MessageContent content={message.content} />
          </div>

          {/* Copy button - shows on hover */}
          <button
            onClick={handleCopy}
            className={cn(
              'absolute -right-10 top-1/2 -translate-y-1/2 p-1.5 rounded-md',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              isUser && '-left-10 -right-auto'
            )}
            title="Copy message"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground mt-1 px-1">
          {formatRelativeTime(message.created_at)}
        </span>

        {/* Sources for assistant messages */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <ChatSources sources={message.sources} />
        )}
      </div>
    </div>
  );
}

/**
 * Simple markdown-like content renderer
 * Handles: **bold**, *italic*, `code`, lists, and line breaks
 */
function MessageContent({ content }: { content: string }) {
  // Handle undefined or null content
  if (!content) {
    return <span>No content available</span>;
  }
  
  // Split content into paragraphs
  const paragraphs = content.split('\n\n');

  return (
    <>
      {paragraphs.map((paragraph, pIndex) => {
        // Check if it's a list
        const lines = paragraph.split('\n');
        const isList = lines.every(
          (line) => line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+\./.test(line.trim())
        );

        if (isList) {
          const isOrdered = /^\d+\./.test(lines[0].trim());
          const ListTag = isOrdered ? 'ol' : 'ul';

          return (
            <ListTag key={pIndex} className={cn(isOrdered ? 'list-decimal' : 'list-disc', 'pl-4 my-2')}>
              {lines.map((line, lIndex) => {
                const text = line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
                return (
                  <li key={lIndex}>
                    <FormattedText text={text} />
                  </li>
                );
              })}
            </ListTag>
          );
        }

        // Regular paragraph
        return (
          <p key={pIndex} className="my-2 first:mt-0 last:mb-0">
            {lines.map((line, lIndex) => (
              <span key={lIndex}>
                <FormattedText text={line} />
                {lIndex < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

/**
 * Formats inline text with bold, italic, and code
 */
function FormattedText({ text }: { text: string }) {
  // Simple regex-based formatting
  // This is a basic implementation - for full markdown, use react-markdown
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={index}
              className="px-1 py-0.5 rounded bg-muted-foreground/20 font-mono text-xs"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
