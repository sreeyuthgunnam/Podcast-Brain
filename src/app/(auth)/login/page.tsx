/**
 * Login Page
 * 
 * Renders the login form for user authentication.
 * Redirects to dashboard if user is already logged in.
 */

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Podcast Brain account to access your podcasts and chat with AI.',
};

export default async function LoginPage() {
  // Check if user is already logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to dashboard if already authenticated
  if (user) {
    redirect('/dashboard');
  }

  return <LoginForm />;
}
