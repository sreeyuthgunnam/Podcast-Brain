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
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();

  const user: User = {
    id: authUser.id,
    email: authUser.email || '',
    full_name: profile?.full_name || authUser.user_metadata?.full_name || null,
    avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
    created_at: profile?.created_at || authUser.created_at,
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden md:flex">
        <Sidebar user={user} />
      </aside>
      <Header user={user} />
      <main className="md:pl-64 min-h-screen">
        <div className="pt-14 md:pt-0">
          <div className="container mx-auto px-5 py-6 max-w-7xl">
            {children}
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
