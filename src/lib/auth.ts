/**
 * Authentication Helper Functions
 * 
 * Provides typed helper functions for common authentication operations.
 * All functions use the Supabase browser client and handle errors gracefully.
 * 
 * Usage:
 * ```tsx
 * import { signIn, signUp, signOut } from '@/lib/auth'
 * 
 * // Sign in
 * const { data, error } = await signIn('email@example.com', 'password')
 * 
 * // Sign up
 * const { data, error } = await signUp('email@example.com', 'password', 'John Doe')
 * ```
 */

import { createClient } from '@/lib/supabase/client';
import { type User } from '@/types';

// ============================================
// TYPES
// ============================================

export interface AuthResponse<T = unknown> {
  data: T | null;
  error: Error | null;
}

export interface SignUpData {
  user: { id: string; email: string } | null;
  session: unknown;
}

export interface SignInData {
  user: { id: string; email: string } | null;
  session: unknown;
}

export interface ProfileUpdateData {
  full_name?: string;
  avatar_url?: string;
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Sign up a new user with email and password
 * 
 * @param email - User's email address
 * @param password - User's password (min 6 characters)
 * @param fullName - User's full name (optional)
 * @returns Auth response with user data or error
 */
export async function signUp(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResponse<SignUpData>> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw error;
    }

    // If we have a user and session, manually create the profile
    // This handles cases where the database trigger might not be set up yet
    if (data.user && data.session) {
      try {
        // Use type assertion for Supabase client without strict typing
        const { error: profileError } = await (supabase
          .from('users') as ReturnType<typeof supabase.from>)
          .upsert({
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName || null,
            avatar_url: null,
          } as Record<string, unknown>, {
            onConflict: 'id'
          });
        
        if (profileError) {
          console.warn('Profile creation warning:', profileError.message);
          // Don't throw - the trigger might handle it
        }
      } catch (profileErr) {
        console.warn('Profile creation attempt failed:', profileErr);
        // Continue anyway - profile might be created by trigger
      }
    }

    return {
      data: {
        user: data.user ? { id: data.user.id, email: data.user.email! } : null,
        session: data.session,
      },
      error: null,
    };
  } catch (err) {
    console.error('Sign up error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to sign up'),
    };
  }
}

/**
 * Sign in a user with email and password
 * 
 * @param email - User's email address
 * @param password - User's password
 * @returns Auth response with user data or error
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse<SignInData>> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return {
      data: {
        user: data.user ? { id: data.user.id, email: data.user.email! } : null,
        session: data.session,
      },
      error: null,
    };
  } catch (err) {
    console.error('Sign in error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to sign in'),
    };
  }
}

/**
 * Sign in with Google OAuth
 * 
 * This will redirect the user to Google's OAuth consent screen.
 * After authentication, they'll be redirected back to /auth/callback.
 * 
 * @param redirectTo - Optional URL to redirect to after auth (default: /dashboard)
 * @returns Auth response or error
 */
export async function signInWithGoogle(
  redirectTo: string = '/dashboard'
): Promise<AuthResponse<{ url: string }>> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw error;
    }

    return {
      data: { url: data.url! },
      error: null,
    };
  } catch (err) {
    console.error('Google sign in error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to sign in with Google'),
    };
  }
}

/**
 * Sign in with GitHub OAuth
 * 
 * This will redirect the user to GitHub's OAuth consent screen.
 * After authentication, they'll be redirected back to /auth/callback.
 * 
 * @param redirectTo - Optional URL to redirect to after auth (default: /dashboard)
 * @returns Auth response or error
 */
export async function signInWithGitHub(
  redirectTo: string = '/dashboard'
): Promise<AuthResponse<{ url: string }>> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      throw error;
    }

    return {
      data: { url: data.url! },
      error: null,
    };
  } catch (err) {
    console.error('GitHub sign in error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to sign in with GitHub'),
    };
  }
}

/**
 * Sign out the current user
 * 
 * Uses 'local' scope for faster logout - only clears local session
 * without making a network request to invalidate the server session.
 * This provides instant feedback while still being secure.
 * 
 * @returns Auth response or error
 */
export async function signOut(): Promise<AuthResponse<null>> {
  try {
    const supabase = createClient();

    // Use 'local' scope for instant logout without network delay
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    if (error) {
      throw error;
    }

    return {
      data: null,
      error: null,
    };
  } catch (err) {
    console.error('Sign out error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to sign out'),
    };
  }
}

/**
 * Send a password reset email
 * 
 * @param email - User's email address
 * @returns Auth response or error
 */
export async function resetPassword(
  email: string
): Promise<AuthResponse<null>> {
  try {
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (error) {
      throw error;
    }

    return {
      data: null,
      error: null,
    };
  } catch (err) {
    console.error('Reset password error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to send reset email'),
    };
  }
}

/**
 * Update the user's password (when logged in)
 * 
 * @param newPassword - The new password
 * @returns Auth response or error
 */
export async function updatePassword(
  newPassword: string
): Promise<AuthResponse<null>> {
  try {
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    return {
      data: null,
      error: null,
    };
  } catch (err) {
    console.error('Update password error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to update password'),
    };
  }
}

/**
 * Update the user's profile in the profiles table
 * 
 * @param updates - Profile fields to update
 * @returns Updated profile or error
 */
export async function updateProfile(
  updates: ProfileUpdateData
): Promise<AuthResponse<User>> {
  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw userError || new Error('Not authenticated');
    }

    // Update the profile
    // Use type assertion for Supabase client without strict typing
    const { data, error } = await (supabase
      .from('users') as ReturnType<typeof supabase.from>)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Also update auth metadata if full_name changed
    if (updates.full_name) {
      await supabase.auth.updateUser({
        data: { full_name: updates.full_name },
      });
    }

    return {
      data: data as User,
      error: null,
    };
  } catch (err) {
    console.error('Update profile error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to update profile'),
    };
  }
}

/**
 * Get the current session
 * 
 * @returns Current session or null
 */
export async function getSession() {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return { data: session, error: null };
  } catch (err) {
    console.error('Get session error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to get session'),
    };
  }
}

/**
 * Check if a user is currently authenticated
 * 
 * @returns Boolean indicating if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: session } = await getSession();
  return !!session;
}