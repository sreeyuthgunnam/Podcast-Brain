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

interface MobileNavProps {
  user: User;
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsOpen(false);
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  const handleLinkClick = () => setIsOpen(false);

  const isActivePath = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-muted-foreground hover:text-foreground hover:bg-accent min-w-[44px] min-h-[44px]"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 bg-[hsl(var(--sidebar-bg))] border-r border-border p-0"
      >
        <SheetHeader className="px-6 py-5 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-left">
            <span className="text-2xl">🎙️</span>
            <span className="text-lg font-semibold tracking-tight">Podcast Brain</span>
          </SheetTitle>
        </SheetHeader>

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
                  'flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-200 min-h-[44px]',
                  'hover:bg-accent',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground/60')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-border" />

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>

          <Separator className="bg-border" />

          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {getInitials(user.full_name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {user.full_name && (
                <p className="text-sm font-medium truncate">{user.full_name}</p>
              )}
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
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
