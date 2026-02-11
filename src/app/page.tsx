/**
 * Landing Page — Apple-inspired design
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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Search,
    title: 'Instant Search',
    description: 'Find any moment across all your podcasts in seconds.',
  },
  {
    icon: MessageSquare,
    title: 'Chat with AI',
    description: 'Ask questions and get answers with exact timestamps.',
  },
  {
    icon: FileText,
    title: 'Smart Summaries',
    description: 'AI-generated summaries and key takeaways for every episode.',
  },
];

const steps = [
  { number: '01', title: 'Upload', description: 'Upload audio files or paste links', icon: Upload },
  { number: '02', title: 'Process', description: 'AI transcribes and indexes automatically', icon: Sparkles },
  { number: '03', title: 'Chat', description: 'Ask anything, get instant answers', icon: MessagesSquare },
];

const useCases = [
  { icon: Headphones, title: 'Podcast Enthusiasts', description: 'Never miss an insight from your favorite shows' },
  { icon: GraduationCap, title: 'Researchers', description: 'Extract knowledge from audio content efficiently' },
  { icon: Mic, title: 'Content Creators', description: 'Repurpose and reference your podcast archive' },
  { icon: Briefcase, title: 'Professionals', description: 'Stay informed with industry podcasts at scale' },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🎙️</span>
            <span className="text-lg font-semibold tracking-tight">Podcast Brain</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by AI
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-balance leading-[1.1]">
              Your AI-Powered{' '}
              <span className="gradient-text">Second Brain</span>{' '}
              for Podcasts
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Search, summarize, and chat with hundreds of hours of podcast content instantly.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="text-base px-8 h-12 rounded-full shadow-smooth">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="text-base px-8 h-12 rounded-full">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to <span className="gradient-text">master podcasts</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features that transform how you consume and retain podcast content.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto stagger-children">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 shadow-smooth hover:shadow-smooth-lg"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple three-step process.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto stagger-children">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative text-center">
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
                  )}
                  <div className="w-24 h-24 rounded-3xl bg-card border border-border flex items-center justify-center mx-auto mb-6 shadow-smooth">
                    <Icon className="h-10 w-10 text-primary" />
                  </div>
                  <div className="text-sm font-medium text-primary mb-2">Step {step.number}</div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Perfect for...</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you&apos;re a casual listener or a power user, Podcast Brain adapts to your needs.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto stagger-children">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              return (
                <div
                  key={useCase.title}
                  className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors text-center shadow-smooth"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{useCase.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-12 shadow-smooth-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to supercharge your podcast learning?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                  Join thousands of podcast enthusiasts who are already using Podcast Brain to unlock insights.
                </p>
                <Link href="/signup">
                  <Button size="lg" className="text-base px-8 h-12 rounded-full shadow-smooth">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground mt-4">
                  Free to start. No credit card required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎙️</span>
              <span className="font-semibold">Podcast Brain</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Podcast Brain. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
