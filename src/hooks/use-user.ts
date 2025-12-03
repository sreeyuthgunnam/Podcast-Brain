/**
 * useUser Hook
 * 
 * Custom React hook for accessing the current authenticated user
 * and their profile data in client components.
 * 
 * Features:
 * - Gets current user from Supabase auth
 * - Fetches user profile from profiles table
 * - Loading state while fetching
 * - Subscribes to auth state changes
 * - Properly typed with User type
 * 
 * Usage:
 * ```tsx
 * 'use client'
 * import { useUser } from '@/hooks/use-user'
 * 
 * export function MyComponent() {
 *   const { user, profile, loading, error } = useUser()
 *   
 *   if (loading) return <div>Loading...</div>
 *   if (!user) return <div>Not logged in</div>
 *   
 *   return <div>Hello, {profile?.full_name || user.email}</div>
 * }
 * ```
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type User } from '@/types';
import { type User as AuthUser } from '@supabase/supabase-js';

interface UseUserReturn {
  /** The authenticated user from Supabase Auth */
  user: AuthUser | null;
  /** The user's profile from the profiles table */
  profile: User | null;
  /** Whether the user data is being loaded */
  loading: boolean;
  /** Any error that occurred during fetching */
  error: Error | null;
  /** Manually refresh the user data */
  refresh: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  /**
   * Fetch the user's profile from the users table
   */
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // Profile might not exist yet (race condition with trigger)
        if (profileError.code === 'PGRST116') {
          console.warn('Profile not found, may still be creating');
          return null;
        }
        throw profileError;
      }

      return data as User;
    } catch (err) {
      console.error('Error fetching profile:', err);
      throw err;
    }
  }, [supabase]);

  /**
   * Fetch user and profile data
   */
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the current user from Supabase Auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      setUser(authUser);

      // If we have a user, fetch their profile
      if (authUser) {
        const userProfile = await fetchProfile(authUser.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchProfile]);

  /**
   * Manually refresh user data
   */
  const refresh = useCallback(async () => {
    await fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    // Initial fetch
    fetchUserData();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            try {
              const userProfile = await fetchProfile(session.user.id);
              setProfile(userProfile);
            } catch {
              // Profile fetch failed silently
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserData, fetchProfile]);

  return {
    user,
    profile,
    loading,
    error,
    refresh,
  };
}
