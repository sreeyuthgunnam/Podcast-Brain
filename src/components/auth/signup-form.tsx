/**
 * Signup Form Component
 * 
 * Features:
 * - Full name, email, password, confirm password inputs
 * - Form validation with react-hook-form + zod
 * - Password strength indicator
 * - Loading states and error handling
 * - Success message for email confirmation
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Lock, Eye, EyeOff, User, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUp } from '@/lib/auth';

// ============================================
// VALIDATION SCHEMA
// ============================================

const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Full name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least 1 number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

// ============================================
// PASSWORD STRENGTH INDICATOR
// ============================================

interface PasswordStrengthProps {
  password: string;
}

function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    };

    if (checks.length) score++;
    if (checks.lowercase) score++;
    if (checks.uppercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  }, [password]);

  const requirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[0-9]/.test(password), text: 'At least 1 number' },
    { met: /[A-Z]/.test(password), text: 'At least 1 uppercase letter' },
    { met: /[^a-zA-Z0-9]/.test(password), text: 'At least 1 special character' },
  ];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className="text-xs text-purple-200/60">{strength.label}</span>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-1">
        {requirements.map((req, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1 text-xs ${
              req.met ? 'text-green-400' : 'text-purple-200/40'
            }`}
          >
            {req.met ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {req.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SIGNUP FORM COMPONENT
// ============================================

export function SignupForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  /**
   * Handle email/password sign up
   */
  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await signUp(
        data.email,
        data.password,
        data.fullName
      );

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Show success message
      setSuccess(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormDisabled = isLoading;

  // Show success message after signup
  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Check your email</h2>
          <p className="text-purple-200/60 mt-2">
            We&apos;ve sent you a confirmation link. Please check your email to
            verify your account.
          </p>
        </div>
        <Button
          variant="outline"
          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          onClick={() => router.push('/login')}
        >
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white">Create an account</h2>
        <p className="text-purple-200/60 mt-1">
          Start your podcast journey today
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name Field */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-purple-100">
            Full Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300/50" />
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-purple-300/30 focus:border-purple-400 focus:ring-purple-400"
              disabled={isFormDisabled}
              {...register('fullName')}
            />
          </div>
          {errors.fullName && (
            <p className="text-sm text-red-400">{errors.fullName.message}</p>
          )}
        </div>

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
          <Label htmlFor="password" className="text-purple-100">
            Password
          </Label>
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
          <PasswordStrength password={password || ''} />
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-purple-100">
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300/50" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-purple-300/30 focus:border-purple-400 focus:ring-purple-400"
              disabled={isFormDisabled}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300/50 hover:text-purple-300 transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-400">
              {errors.confirmPassword.message}
            </p>
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
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      {/* Terms */}
      <p className="text-center text-xs text-purple-200/40">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="text-purple-300 hover:text-purple-200">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-purple-300 hover:text-purple-200">
          Privacy Policy
        </Link>
      </p>

      {/* Sign In Link */}
      <p className="text-center text-sm text-purple-200/60">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-purple-300 hover:text-purple-200 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
