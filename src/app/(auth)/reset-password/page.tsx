import { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Set New Password',
  description: 'Set a new password for your Podcast Brain account.',
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
