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

const signupSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').min(2, 'Full name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters').regex(/[0-9]/, 'Password must contain at least 1 number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-destructive' };
    if (score <= 3) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  }, [password]);

  const requirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[0-9]/.test(password), text: 'At least 1 number' },
    { met: /[A-Z]/.test(password), text: '1 uppercase letter' },
    { met: /[^a-zA-Z0-9]/.test(password), text: '1 special character' },
  ];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${strength.color}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{strength.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {requirements.map((req, idx) => (
          <div key={idx} className={`flex items-center gap-1 text-xs ${req.met ? 'text-emerald-500' : 'text-muted-foreground'}`}>
            {req.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {req.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: signUpError } = await signUp(data.email, data.password, data.fullName);
      if (signUpError) { setError(signUpError.message); return; }
      setSuccess(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Check your email</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            We&apos;ve sent you a confirmation link. Please check your email to verify your account.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/login')}>
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Create an account</h2>
        <p className="text-muted-foreground mt-1 text-sm">Start your podcast journey today</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="fullName" type="text" placeholder="John Doe" className="pl-10" disabled={isLoading} {...register('fullName')} />
          </div>
          {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="email" type="email" placeholder="you@example.com" className="pl-10" disabled={isLoading} {...register('email')} />
          </div>
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pl-10 pr-10" disabled={isLoading} {...register('password')} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          <PasswordStrength password={password || ''} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" className="pl-10 pr-10" disabled={isLoading} {...register('confirmPassword')} />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>) : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="text-primary hover:text-primary/80">Terms</Link>{' '}and{' '}
        <Link href="/privacy" className="text-primary hover:text-primary/80">Privacy Policy</Link>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">Sign in</Link>
      </p>
    </div>
  );
}
