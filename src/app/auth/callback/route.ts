/**
 * Auth Callback Route
 * 
 * Handles OAuth callbacks and email confirmations from Supabase Auth.
 * 
 * This route is called when:
 * 1. User signs in with OAuth (Google, GitHub)
 * 2. User confirms their email after signing up
 * 3. User clicks password reset link
 * 
 * Flow:
 * 1. Extract the 'code' from URL search params
 * 2. Exchange code for session using Supabase
 * 3. Redirect to /dashboard on success (or redirectTo if specified)
 * 4. Redirect to /login?error=... on failure
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type Database } from '@/types';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  
  // Get the authorization code from the URL
  const code = requestUrl.searchParams.get('code');
  
  // Get optional redirect destination
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';
  
  // Get the type of auth callback (for password recovery)
  const type = requestUrl.searchParams.get('type');
  
  // Handle error from OAuth provider
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );

    try {
      // Exchange the code for a session
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        const loginUrl = new URL('/login', requestUrl.origin);
        loginUrl.searchParams.set('error', exchangeError.message);
        return NextResponse.redirect(loginUrl);
      }

      // Handle password recovery redirect
      if (type === 'recovery') {
        // Redirect to password reset page
        const resetUrl = new URL('/reset-password', requestUrl.origin);
        return NextResponse.redirect(resetUrl);
      }

      // Successful authentication - redirect to dashboard or specified URL
      const successUrl = new URL(redirectTo, requestUrl.origin);
      return NextResponse.redirect(successUrl);
      
    } catch (err) {
      console.error('Auth callback error:', err);
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', 'Authentication failed. Please try again.');
      return NextResponse.redirect(loginUrl);
    }
  }

  // No code present - redirect to login with error
  console.error('No code in callback URL');
  const loginUrl = new URL('/login', requestUrl.origin);
  loginUrl.searchParams.set('error', 'Invalid authentication callback');
  return NextResponse.redirect(loginUrl);
}
