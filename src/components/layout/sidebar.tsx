/**
 * Sidebar Component
 * 
 * Dashboard navigation sidebar with:
 * - Logo section at top
 * - Navigation links with active state
 * - User section at bottom with avatar and logout
 * 
 * Style: Modern, clean (Linear/Notion inspired)
 */

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
import { signOut } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

// ============================================
// NAVIGATION ITEMS
// ============================================

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Library',
    href: '/library',
    icon: Library,
  },
  {
    label: 'Upload',
    href: '/upload',
    icon: Upload,
  },
  {
    label: 'Chat',
    href: '/chat',
    icon: MessageSquare,
  },
];

// ============================================
// SIDEBAR PROPS
// ============================================

interface SidebarProps {
  user: User;
}

// ============================================
// NAV LINK COMPONENT
// ============================================

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}

function NavLink({ href, label, icon: Icon, isActive }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
        'hover:bg-white/5 min-h-[44px]',
        isActive
          ? 'bg-purple-500/10 text-purple-400'
          : 'text-gray-400 hover:text-white'
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 transition-colors',
          isActive ? 'text-purple-400' : 'text-gray-500'
        )}
      />
      {label}
    </Link>
  );
}

// ============================================
// SIDEBAR COMPONENT
// ============================================

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Get user initials for avatar fallback
   */
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  /**
   * Handle logout with loading state and redirect
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      // Force immediate redirect without waiting
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  /**
   * Check if a path is active (exact match or starts with for nested routes)
   */
  const isActivePath = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gray-950 border-r border-white/5 flex flex-col">
      {/* Logo Section */}
      <div className="flex items-center gap-2 px-6 py-5">
        <span className="text-2xl">🎙️</span>
        <span className="text-lg font-semibold text-white tracking-tight">
          Podcast Brain
        </span>
      </div>

      <Separator className="bg-white/5" />

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigationItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isActivePath(item.href)}
          />
        ))}
      </nav>

      <Separator className="bg-white/5" />

      {/* User Section */}
      <div className="p-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
            <AvatarFallback className="bg-purple-500/20 text-purple-300 text-sm font-medium">
              {getInitials(user.full_name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {user.full_name && (
              <p className="text-sm font-medium text-white truncate">
                {user.full_name}
              </p>
            )}
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full mt-2 justify-start text-gray-400 hover:text-white hover:bg-white/5 min-h-[44px]"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          {isLoggingOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </div>
    </aside>
  );
}
