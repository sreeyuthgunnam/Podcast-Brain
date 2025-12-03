/**
 * Library Page
 * - List all uploaded podcasts
 * - Search and filter functionality
 * - Sort by date, name, duration
 * - Responsive grid layout
 * - Pagination
 */

import { Metadata } from 'next';
import { LibraryPageClient } from './library-page-client';

export const metadata: Metadata = {
  title: 'My Library',
  description: 'Browse, search, and manage your podcast library.',
};

export default function LibraryPage() {
  return <LibraryPageClient />;
}
