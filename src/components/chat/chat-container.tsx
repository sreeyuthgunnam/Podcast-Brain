'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { cn } from '@/lib/utils';

interface ChatContainerProps {
  podcastId?: string;
  className?: string;
}

export function ChatContainer({ podcastId, className }: ChatContainerProps) {
  const {
    messages,
    isLoading,
    error,
    setCurrentPodcastId,
    fetchHistory,
    sendMessage,
    setError,
  } = useChatStore();

  // Initialize chat store with podcastId and fetch history on mount
  useEffect(() => {
    setCurrentPodcastId(podcastId || null);
    fetchHistory(podcastId);
  }, [podcastId, setCurrentPodcastId, fetchHistory]);

  const handleSend = (content: string) => {
    sendMessage(content);
  };

  const handleRetry = () => {
    setError(null);
    fetchHistory(podcastId);
  };

  return (
    <div className={cn('flex flex-col h-full bg-background max-w-4xl mx-auto', className)}>
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border-b border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive flex-1">{error}</p>
          <button
            onClick={handleRetry}
            className="text-sm text-destructive hover:text-destructive/80 font-medium flex items-center gap-1 min-h-[44px] px-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {/* Messages area */}
      <ChatMessages messages={messages} isLoading={isLoading} className="flex-1" />

      {/* Input area */}
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        placeholder={
          podcastId
            ? 'Ask about this podcast...'
            : 'Ask anything about your podcasts...'
        }
      />
    </div>
  );
}
