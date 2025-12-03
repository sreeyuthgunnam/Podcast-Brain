/**
 * Chat Store (Zustand)
 * - Manages chat messages state
 * - Current podcast context (null = all podcasts)
 * - Loading/error state
 * - API integration for chat operations
 */

import { create } from 'zustand';
import { type ChatMessage } from '@/types';
import { showError } from '@/lib/toast';

// ============================================================================
// Types
// ============================================================================

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentPodcastId: string | null; // null = chat across all podcasts

  // Actions
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentPodcastId: (id: string | null) => void;
  clearMessages: () => void;

  // Async actions
  fetchHistory: (podcastId?: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: (podcastId?: string) => Promise<void>;
}

// ============================================================================
// Store
// ============================================================================

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  currentPodcastId: null,

  // ----------------------------------------------------------------------------
  // Synchronous Actions
  // ----------------------------------------------------------------------------

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setCurrentPodcastId: (id) => set({ currentPodcastId: id }),

  clearMessages: () => set({ messages: [], error: null }),

  // ----------------------------------------------------------------------------
  // Async Actions
  // ----------------------------------------------------------------------------

  /**
   * Fetch chat history from API
   * Note: We don't persist chat history to DB, so just clear messages on load
   */
  fetchHistory: async (_podcastId?: string) => {
    const { setLoading, setError, setMessages } = get();

    setLoading(true);
    setError(null);

    // Chat history is not persisted, start fresh
    setMessages([]);
    setLoading(false);
  },

  /**
   * Send a message and get AI response
   */
  sendMessage: async (content: string) => {
    const { currentPodcastId, messages, addMessage, setLoading, setError } = get();

    // Don't send empty messages
    if (!content.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    // Create optimistic user message
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: '', // Will be set by server
      podcast_id: currentPodcastId,
      role: 'user',
      content: content.trim(),
      sources: null,
      created_at: new Date().toISOString(),
    };

    // Optimistically add user message
    addMessage(userMessage);

    try {
      // Prepare conversation history (last 10 messages for context)
      const history = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          podcastId: currentPodcastId,
          history,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send message';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // Response wasn't JSON
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: data.id || `assistant-${Date.now()}`,
        user_id: '', // Set by server
        podcast_id: currentPodcastId,
        role: 'assistant',
        content: data.response || data.message || 'No response received',
        sources: data.sources || null,
        created_at: new Date().toISOString(),
      };

      addMessage(assistantMessage);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send message';
      setError(errorMessage);
      showError('Failed to send message', errorMessage);
      console.error('Failed to send message:', error);

      // Remove the optimistic user message on error
      set((state) => ({
        messages: state.messages.filter((msg) => msg.id !== userMessage.id),
      }));
    } finally {
      setLoading(false);
    }
  },

  /**
   * Clear chat history (local only, not persisted)
   */
  clearHistory: async (_podcastId?: string) => {
    const { clearMessages } = get();
    // Just clear local messages - chat is not persisted
    clearMessages();
  },
}));
