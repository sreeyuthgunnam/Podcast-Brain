/**
 * Chat Page
 * - RAG-powered chat interface
 * - Chat with all podcasts or select specific ones
 * - Message history
 * - Source citations from transcripts
 * - Suggested questions
 */

import { Metadata } from 'next';
import { ChatPageClient } from './chat-page-client';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chat with your podcasts using AI - ask questions and get insights from your content.',
};

export default function ChatPage() {
  return <ChatPageClient />;
}
