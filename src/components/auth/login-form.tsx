/**
 * Login Form Component
 * 
 * Features:
 * - Email/password inputs with validation
 * - Form validation with react-hook-form + zod
 * - Loading states and error handling
 * - Links to signup and forgot password
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/lib/auth';

// ============================================
// VALIDATION SCHEMA
// ============================================

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ============================================
// LOGIN FORM COMPONENT
// ============================================

export function LoginForm() {
  const searchParams = useSearchParams();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get redirect URL and any error from URL params
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const urlError = searchParams.get('error');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  /**
   * Handle email/password sign in
   */
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await signIn(data.email, data.password);

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      // Successful login - use window.location for full page refresh
      // This ensures the server-side session is properly updated
      window.location.href = redirectTo;
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const isFormDisabled = isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
        <p className="text-purple-200/60 mt-1">
          Sign in to your account to continue
        </p>
      </div>

      {/* Error display */}
      {(error || urlError) && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-200">
          {error || urlError}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-purple-100">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300/50" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-purple-300/30 focus:border-purple-400 focus:ring-purple-400"
              disabled={isFormDisabled}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-400">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-purple-100">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-purple-300 hover:text-purple-200 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300/50" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-purple-300/30 focus:border-purple-400 focus:ring-purple-400"
              disabled={isFormDisabled}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300/50 hover:text-purple-300 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-400">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          disabled={isFormDisabled}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-purple-200/60">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-purple-300 hover:text-purple-200 font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
