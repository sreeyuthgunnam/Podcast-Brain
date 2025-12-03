/**
 * Signup Page
 * 
 * Renders the signup form for new user registration.
 * Redirects to dashboard if user is already logged in.
 */

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a Podcast Brain account to upload podcasts and chat with AI.',
};

export default async function SignupPage() {
  // Check if user is already logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to dashboard if already authenticated
  if (user) {
    redirect('/dashboard');
  }

  return <SignupForm />;
}
