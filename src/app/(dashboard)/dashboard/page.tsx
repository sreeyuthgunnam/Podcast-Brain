/**
 * Dashboard Page
 * - Overview of user's podcasts
 * - Recent activity
 * - Quick stats (total podcasts, transcription hours, etc.)
 * - Quick actions (upload, chat)
 */

import { Metadata } from 'next';
import { DashboardPageClient } from './dashboard-page-client';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your podcast dashboard - view stats, recent uploads, and quick actions.',
};

export default function DashboardPage() {
  return <DashboardPageClient />;
}
