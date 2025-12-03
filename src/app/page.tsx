/**
 * Landing Page
 * 
 * Marketing landing page for Podcast Brain (when not logged in)
 * Redirects to /dashboard if user is authenticated
 * 
 * Sections:
 * 1. Hero - Main value proposition with CTAs
 * 2. Features - 3-column grid of key features
 * 3. How It Works - 3 step process
 * 4. Use Cases - Target audience
 * 5. CTA - Final conversion section
 * 6. Footer - Links and copyright
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Search,
  MessageSquare,
  FileText,
  Upload,
  Sparkles,
  MessagesSquare,
  Headphones,
  GraduationCap,
  Mic,
  Briefcase,
  ArrowRight,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

// ============================================
// FEATURE DATA
// ============================================

const features = [
  {
    icon: Search,
    title: 'Instant Search',
    description:
      'Find any moment across all your podcasts in seconds. No more scrubbing through hours of audio.',
    emoji: '🎯',
  },
  {
    icon: MessageSquare,
    title: 'Chat with AI',
    description:
      'Ask questions in natural language and get accurate answers with exact timestamps.',
    emoji: '💬',
  },
  {
    icon: FileText,
    title: 'Smart Summaries',
    description:
      'Get AI-generated summaries and key takeaways for every episode automatically.',
    emoji: '📝',
  },
];

// ============================================
// STEPS DATA
// ============================================

const steps = [
  {
    number: '01',
    title: 'Upload',
    description: 'Upload audio files or paste YouTube/Spotify links',
    icon: Upload,
  },
  {
    number: '02',
    title: 'Process',
    description: 'AI transcribes and indexes your content automatically',
    icon: Sparkles,
  },
  {
    number: '03',
    title: 'Chat',
    description: 'Ask anything, get instant answers with citations',
    icon: MessagesSquare,
  },
];

// ============================================
// USE CASES DATA
// ============================================

const useCases = [
  {
    icon: Headphones,
    title: 'Podcast Enthusiasts',
    description: 'Never miss an insight from your favorite shows',
  },
  {
    icon: GraduationCap,
    title: 'Researchers & Students',
    description: 'Extract knowledge from audio content efficiently',
  },
  {
    icon: Mic,
    title: 'Content Creators',
    description: 'Repurpose and reference your podcast archive',
  },
  {
    icon: Briefcase,
    title: 'Professionals',
    description: 'Stay informed with industry podcasts at scale',
  },
];

// ============================================
// LANDING PAGE COMPONENT
// ============================================

export default async function LandingPage() {
  // Check if user is logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to dashboard if authenticated
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-lg border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎙️</span>
            <span className="text-lg font-semibold tracking-tight">
              Podcast Brain
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-gray-950 to-gray-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-8">
              <Zap className="h-4 w-4" />
              Powered by AI
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Your AI-Powered{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Second Brain
              </span>{' '}
              for Podcasts
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              Search, summarize, and chat with hundreds of hours of podcast
              content instantly. Never miss an insight again.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-lg px-8 h-12"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/5 text-lg px-8 h-12"
                >
                  Learn More
                  <ChevronDown className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to{' '}
              <span className="text-purple-400">master podcasts</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Powerful features that transform how you consume and retain podcast
              content.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-2xl bg-gray-900/50 border border-white/5 hover:border-purple-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">{feature.emoji}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Get started in minutes with our simple three-step process.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-purple-500/50 to-transparent" />
                  )}
                  
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                      <Icon className="h-10 w-10 text-purple-400" />
                    </div>
                    <div className="text-sm font-medium text-purple-400 mb-2">
                      Step {step.number}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-gray-400">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Perfect for...
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Whether you&apos;re a casual listener or a power user, Podcast Brain
              adapts to your needs.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              return (
                <div
                  key={useCase.title}
                  className="p-6 rounded-xl bg-gray-900/50 border border-white/5 hover:border-purple-500/30 transition-colors text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-7 w-7 text-purple-400" />
                  </div>
                  <h3 className="font-semibold mb-1">{useCase.title}</h3>
                  <p className="text-sm text-gray-400">{useCase.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="relative">
              {/* Background glow */}
              <div className="absolute inset-0 bg-purple-500/20 rounded-3xl blur-3xl" />
              
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-900/50 border border-white/10 rounded-3xl p-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to supercharge your podcast learning?
                </h2>
                <p className="text-gray-400 mb-8">
                  Join thousands of podcast enthusiasts who are already using
                  Podcast Brain to unlock insights.
                </p>
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700 text-lg px-8 h-12"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <p className="text-sm text-gray-500 mt-4">
                  Free to start. No credit card required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎙️</span>
              <span className="font-semibold">Podcast Brain</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Podcast Brain. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
