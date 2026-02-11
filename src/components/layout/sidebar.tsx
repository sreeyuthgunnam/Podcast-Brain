'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Library,
  Upload,
  MessageSquare,
  LogOut,
  Loader2,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { signOut } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

const navigationItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Library', href: '/library', icon: Library },
  { label: 'Upload', href: '/upload', icon: Upload },
  { label: 'Chat', href: '/chat', icon: MessageSquare },
];

interface SidebarProps {
  user: User;
}

function NavLink({ href, label, icon: Icon, isActive }: { href: string; label: string; icon: React.ElementType; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
        'hover:bg-accent min-h-[44px]',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className={cn('h-[18px] w-[18px] transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')} />
      {label}
    </Link>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  const isActivePath = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5">
        <span className="text-2xl">🎙️</span>
        <span className="text-lg font-semibold tracking-tight">Podcast Brain</span>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigationItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} isActive={isActivePath(item.href)} />
        ))}
      </nav>

      <Separator />

      {/* Bottom section */}
      <div className="p-4 space-y-3">
        {/* Theme toggle */}
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-muted-foreground font-medium">Theme</span>
          <ThemeToggle />
        </div>

        <Separator />

        {/* User info */}
        <div className="flex items-center gap-3 px-2 py-1">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {getInitials(user.full_name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {user.full_name && <p className="text-sm font-medium truncate">{user.full_name}</p>}
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground min-h-[40px] text-sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
          {isLoggingOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </div>
    </aside>
  );
}
