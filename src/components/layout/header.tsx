/**
 * Header Component
 * 
 * Mobile-only top header bar:
 * - Hamburger menu button (left)
 * - App name centered
 * - User avatar (right)
 * 
 * Hidden on desktop (md:hidden)
 */

'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MobileNav } from './mobile-nav';
import type { User } from '@/types';

// ============================================
// HEADER PROPS
// ============================================

interface HeaderProps {
  user: User;
}

// ============================================
// HEADER COMPONENT
// ============================================

export function Header({ user }: HeaderProps) {
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:hidden bg-gray-950/95 backdrop-blur-sm border-b border-white/5">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Mobile Menu Button */}
        <MobileNav user={user} />

        {/* App Name - Centered */}
        <Link
          href="/dashboard"
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
        >
          <span className="text-xl">🎙️</span>
          <span className="text-base font-semibold text-white tracking-tight">
            Podcast Brain
          </span>
        </Link>

        {/* User Avatar */}
        <Link href="/dashboard" className="flex items-center p-1 -m-1 min-w-[44px] min-h-[44px] justify-center">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.avatar_url || undefined}
              alt={user.full_name || user.email}
            />
            <AvatarFallback className="bg-purple-500/20 text-purple-300 text-xs font-medium">
              {getInitials(user.full_name, user.email)}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
