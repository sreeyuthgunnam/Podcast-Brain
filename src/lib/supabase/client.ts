/**
 * Supabase Browser Client
 * 
 * Creates a Supabase client for use in Client Components.
 * This client runs in the browser and handles authentication state.
 * 
 * Usage:
 * ```tsx
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 * 
 * const supabase = createClient()
 * const { data } = await supabase.from('podcasts').select()
 * ```
 */

import { createBrowserClient } from '@supabase/ssr';
import { type Database } from '@/types';

/**
 * Create a Supabase client for browser/client components
 * 
 * @returns Typed Supabase client for browser use
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
