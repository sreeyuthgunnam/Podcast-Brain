/**
 * Auth Layout — Apple-inspired, clean glassmorphism
 */

import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/8 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/6 rounded-full blur-[100px]" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center mb-8 group">
          <div className="flex items-center justify-center w-16 h-16 bg-card border border-border rounded-2xl mb-4 shadow-smooth group-hover:shadow-smooth-lg transition-shadow duration-300">
            <span className="text-4xl" role="img" aria-label="Podcast Brain logo">🎙️</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Podcast Brain</h1>
          <p className="text-sm text-muted-foreground mt-1">Your AI-powered podcast companion</p>
        </Link>

        {/* Auth card */}
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-smooth-lg border border-border p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-xs mt-8">
          © {new Date().getFullYear()} Podcast Brain. All rights reserved.
        </p>
      </div>
    </div>
  );
}
