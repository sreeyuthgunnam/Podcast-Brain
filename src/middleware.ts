/**
 * Next.js Middleware
 * 
 * This middleware runs on every request matching the configured paths.
 * It handles:
 * 1. Refreshing Supabase auth tokens
 * 2. Protecting dashboard routes (redirect to login if not authenticated)
 * 3. Redirecting authenticated users away from auth pages
 */

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Routes that require authentication
 */
const protectedRoutes = [
  '/dashboard',
  '/library',
  '/upload',
  '/episode',
  '/chat',
];

/**
 * Routes that should redirect to dashboard if already authenticated
 */
const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Update session and get user
  const { supabaseResponse, user } = await updateSession(request);

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname.startsWith(route)
  );

  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(
    (route) => pathname.startsWith(route)
  );

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    // Store the original URL to redirect back after login
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

/**
 * Matcher configuration
 * 
 * This middleware will run on all routes except:
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicon file)
 * - public folder files (images, etc.)
 * - API routes (handled separately)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
