'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  ChevronDown,
  Upload,
  Sparkles,
  Mic,
  Check,
} from 'lucide-react';
import { ChatContainer } from '@/components/chat';
import { useChatStore } from '@/stores/chat-store';
import { type Podcast } from '@/types';
import { cn } from '@/lib/utils';

// Suggested prompts for empty chat state
const SUGGESTED_PROMPTS = [
  {
    icon: Sparkles,
    text: 'What are the main topics discussed?',
  },
  {
    icon: MessageSquare,
    text: 'Summarize the key takeaways',
  },
  {
    icon: Mic,
    text: 'What insights can you share from my podcasts?',
  },
];

export function ChatPageClient() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [selectedPodcastId, setSelectedPodcastId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { messages, sendMessage, setCurrentPodcastId } = useChatStore();

  // Fetch user's podcasts
  useEffect(() => {
    async function fetchPodcasts() {
      try {
        const response = await fetch('/api/podcasts');
        if (response.ok) {
          const data = await response.json();
          // Only show podcasts that are ready for chat
          const readyPodcasts = (data.podcasts || []).filter(
            (p: Podcast) => p.status === 'ready'
          );
          setPodcasts(readyPodcasts);
        }
      } catch (error) {
        console.error('Failed to fetch podcasts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPodcasts();
  }, []);

  // Update chat store when podcast selection changes
  useEffect(() => {
    setCurrentPodcastId(selectedPodcastId);
  }, [selectedPodcastId, setCurrentPodcastId]);

  const handlePodcastSelect = (podcastId: string | null) => {
    setSelectedPodcastId(podcastId);
    setIsDropdownOpen(false);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const selectedPodcast = podcasts.find((p) => p.id === selectedPodcastId);

  // Empty state - no podcasts uploaded yet
  if (!isLoading && podcasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] px-4">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Mic className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">
          No podcasts yet
        </h1>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Upload your first podcast to start chatting! Our AI will help you
          explore and understand your content.
        </p>
        <Link
          href="/upload"
          className={cn(
            'inline-flex items-center gap-2 px-6 py-3 rounded-lg',
            'bg-primary text-primary-foreground font-medium',
            'hover:bg-primary/90 transition-colors'
          )}
        >
          <Upload className="w-5 h-5" />
          Upload a Podcast
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 px-1 sm:px-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Chat with Your Podcasts</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Ask questions and get insights from your podcast library
          </p>
        </div>

        {/* Podcast Filter Dropdown */}
        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg border',
              'bg-background hover:bg-muted active:bg-muted/80 transition-colors',
              'text-sm font-medium w-full sm:min-w-[200px] justify-between min-h-[44px]'
            )}
          >
            <span className="truncate">
              {selectedPodcast ? selectedPodcast.title : 'All Podcasts'}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 shrink-0 transition-transform',
                isDropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />

              {/* Menu */}
              <div className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-64 rounded-lg border bg-background shadow-lg z-20 py-1 max-h-80 overflow-y-auto">
                {/* All Podcasts option */}
                <button
                  onClick={() => handlePodcastSelect(null)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 sm:py-2 text-sm',
                    'hover:bg-muted active:bg-muted/80 transition-colors text-left min-h-[44px]',
                    !selectedPodcastId && 'bg-primary/5 text-primary'
                  )}
                >
                  <span className="font-medium">All Podcasts</span>
                  {!selectedPodcastId && <Check className="w-4 h-4" />}
                </button>

                {/* Divider */}
                {podcasts.length > 0 && (
                  <div className="border-t my-1" />
                )}

                {/* Podcast list */}
                {podcasts.map((podcast) => (
                  <button
                    key={podcast.id}
                    onClick={() => handlePodcastSelect(podcast.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 sm:py-2 text-sm',
                      'hover:bg-muted active:bg-muted/80 transition-colors text-left min-h-[44px]',
                      selectedPodcastId === podcast.id && 'bg-primary/5 text-primary'
                    )}
                  >
                    <span className="truncate pr-2">{podcast.title}</span>
                    {selectedPodcastId === podcast.id && (
                      <Check className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Suggested Prompts - show when chat is empty */}
      {messages.length === 0 && (
        <div className="px-1 sm:px-0 mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
            Try asking:
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedPrompt(prompt.text)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-3 sm:py-2 rounded-full',
                  'border bg-background hover:bg-muted active:bg-muted/80 transition-colors',
                  'text-sm min-h-[44px] text-left'
                )}
              >
                <prompt.icon className="w-4 h-4 text-primary shrink-0" />
                <span>{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 border rounded-xl overflow-hidden bg-background shadow-sm">
        <ChatContainer
          podcastId={selectedPodcastId || undefined}
          className="h-full"
        />
      </div>
    </div>
  );
}
