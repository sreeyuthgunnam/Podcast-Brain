/**
 * Mobile Navigation Component
 * 
 * A slide-out drawer navigation for mobile screens:
 * - Sheet component from shadcn/ui
 * - Same navigation items as Sidebar
 * - Auto-closes on link click
 * - User section at bottom
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
  Menu,
  Loader2,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
// MOBILE NAV PROPS
// ============================================

interface MobileNavProps {
  user: User;
}

// ============================================
// MOBILE NAV COMPONENT
// ============================================

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
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
    setIsOpen(false);
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
   * Handle link click - close the drawer
   */
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  /**
   * Check if a path is active
   */
  const isActivePath = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-gray-400 hover:text-white hover:bg-white/5 min-w-[44px] min-h-[44px] active:bg-white/10"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 bg-gray-950 border-r border-white/5 p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-white/5">
          <SheetTitle className="flex items-center gap-2 text-left">
            <span className="text-2xl">🎙️</span>
            <span className="text-lg font-semibold text-white tracking-tight">
              Podcast Brain
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigationItems.map((item) => {
            const isActive = isActivePath(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 px-4 py-3.5 rounded-lg text-base font-medium transition-all duration-200',
                  'hover:bg-white/5 min-h-[44px]',
                  'active:bg-white/10',
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
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-white/5" />

        {/* User Section */}
        <div className="p-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={user.avatar_url || undefined}
                alt={user.full_name || user.email}
              />
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
            className="w-full mt-2 justify-start text-gray-400 hover:text-white hover:bg-white/5"
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
      </SheetContent>
    </Sheet>
  );
}
