/**
 * Dashboard Layout
 * 
 * Protected layout wrapper for all dashboard pages:
 * - Server component that fetches user data
 * - Redirects to login if not authenticated
 * - Desktop: Fixed sidebar (256px) + main content
 * - Mobile: Header with hamburger menu + full width content
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';
import type { User } from '@/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();

  // Get current authenticated user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!authUser) {
    redirect('/login');
  }

  // Fetch user profile from database
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  // Build user object (fallback to auth user data if profile doesn't exist yet)
  const user: User = {
    id: authUser.id,
    email: authUser.email || '',
    full_name: profile?.full_name || authUser.user_metadata?.full_name || null,
    avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
    created_at: profile?.created_at || authUser.created_at,
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex">
        <Sidebar user={user} />
      </aside>

      {/* Mobile Header - Hidden on desktop */}
      <Header user={user} />

      {/* Main Content Area */}
      <main className="md:pl-64 min-h-screen">
        {/* Add top padding on mobile for fixed header */}
        <div className="pt-14 md:pt-0">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </div>
        </div>
      </main>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
