/**
 * Auth Layout
 * 
 * A centered layout for authentication pages (login, signup).
 * Features:
 * - Centered card in the middle of the screen
 * - Gradient background with subtle pattern
 * - App logo/name at the top
 * - Clean, minimal design
 * - Fully responsive
 */

import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      {/* Gradient orbs for visual interest */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
      
      {/* Content container */}
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {/* Logo and branding */}
        <Link 
          href="/" 
          className="flex flex-col items-center mb-8 group"
        >
          <div className="flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 group-hover:bg-white/20 transition-colors duration-300">
            <span className="text-5xl" role="img" aria-label="Podcast Brain logo">
              🎙️
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Podcast Brain
          </h1>
          <p className="text-sm text-purple-200/60 mt-1">
            Your AI-powered podcast companion
          </p>
        </Link>

        {/* Auth card */}
        <div className="bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-purple-200/40 text-xs mt-8">
          © {new Date().getFullYear()} Podcast Brain. All rights reserved.
        </p>
      </div>
    </div>
  );
}
