'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Check,
  Loader2,
  Circle,
  AlertCircle,
  Upload,
  FileAudio,
  Sparkles,
  Search,
  MessageSquare,
  RefreshCw,
  PartyPopper,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { PodcastStatus } from '@/types';

interface ProcessingStatusProps {
  status: PodcastStatus;
  errorMessage?: string;
  onRetry?: () => void;
  podcastId?: string;
  updatedAt?: string;
}

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  estimatedTime?: string;
}

type StepStatus = 'completed' | 'current' | 'pending' | 'error';

const steps: Step[] = [
  { id: 'upload', label: 'Upload Complete', description: 'Audio file uploaded successfully', icon: Upload },
  { id: 'transcribe', label: 'Transcribing Audio', description: 'Converting speech to text with AI', icon: FileAudio, estimatedTime: '2-5 minutes' },
  { id: 'summary', label: 'Generating Summary', description: 'Creating summary and extracting topics', icon: Sparkles, estimatedTime: '30 seconds' },
  { id: 'index', label: 'Indexing for Search', description: 'Creating embeddings for semantic search', icon: Search, estimatedTime: '1 minute' },
  { id: 'ready', label: 'Ready to Chat!', description: 'Your podcast is ready for AI-powered chat', icon: MessageSquare },
];

function getStepIndex(status: PodcastStatus): number {
  switch (status) {
    case 'uploading': return 0;
    case 'transcribing': return 1;
    case 'processing': return 3;
    case 'ready': return 5;
    case 'error': return -1;
    default: return 0;
  }
}

function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number }>>([]);

  useEffect(() => {
    setParticles(Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
    })));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: `${particle.x}%`,
            animationDelay: `${particle.delay}s`,
            backgroundColor: ['#a855f7', '#ec4899', '#3b82f6', '#22c55e', '#eab308'][particle.id % 5],
          }}
        />
      ))}
    </div>
  );
}

interface StepIndicatorProps {
  step: Step;
  status: StepStatus;
  isLast: boolean;
}

function StepIndicator({ step, status, isLast }: StepIndicatorProps) {
  const Icon = step.icon;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500',
            status === 'completed' && 'bg-emerald-500/15 text-emerald-500',
            status === 'current' && 'bg-primary/15 text-primary animate-pulse',
            status === 'pending' && 'bg-muted text-muted-foreground/40',
            status === 'error' && 'bg-destructive/15 text-destructive'
          )}
        >
          {status === 'completed' && <Check className="h-5 w-5" />}
          {status === 'current' && <Loader2 className="h-5 w-5 animate-spin" />}
          {status === 'pending' && <Circle className="h-5 w-5" />}
          {status === 'error' && <AlertCircle className="h-5 w-5" />}
        </div>

        {!isLast && (
          <div
            className={cn(
              'w-0.5 h-12 mt-2 transition-all duration-500',
              status === 'completed' && 'bg-emerald-500/40',
              status === 'current' && 'bg-gradient-to-b from-primary/40 to-border',
              status === 'pending' && 'bg-border',
              status === 'error' && 'bg-destructive/40'
            )}
          />
        )}
      </div>

      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              'h-4 w-4',
              status === 'completed' && 'text-emerald-500',
              status === 'current' && 'text-primary',
              status === 'pending' && 'text-muted-foreground/40',
              status === 'error' && 'text-destructive'
            )}
          />
          <h3
            className={cn(
              'font-medium',
              status === 'completed' && 'text-emerald-500',
              status === 'current' && 'text-foreground',
              status === 'pending' && 'text-muted-foreground/40',
              status === 'error' && 'text-destructive'
            )}
          >
            {step.label}
          </h3>
        </div>
        <p className={cn('text-sm mt-1', status === 'pending' ? 'text-muted-foreground/30' : 'text-muted-foreground')}>
          {step.description}
        </p>
        {status === 'current' && step.estimatedTime && (
          <p className="text-xs text-primary/70 mt-2">
            Estimated time: {step.estimatedTime}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProcessingStatus({
  status,
  errorMessage,
  onRetry,
  podcastId,
  updatedAt,
}: ProcessingStatusProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexError, setReindexError] = useState<string | null>(null);
  const currentStepIndex = getStepIndex(status);

  useEffect(() => {
    if (status === 'processing' && updatedAt) {
      const checkStuck = () => {
        const lastUpdate = new Date(updatedAt).getTime();
        const twoMinutes = 2 * 60 * 1000;
        setIsStuck(Date.now() - lastUpdate > twoMinutes);
      };
      checkStuck();
      const interval = setInterval(checkStuck, 10000);
      return () => clearInterval(interval);
    } else {
      setIsStuck(false);
    }
  }, [status, updatedAt]);

  useEffect(() => {
    if (status === 'ready') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleReindex = useCallback(async () => {
    if (!podcastId) return;
    setIsReindexing(true);
    setReindexError(null);
    try {
      const response = await fetch('/api/reindex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podcastId }),
      });
      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reindex');
      }
    } catch (error) {
      console.error('Reindex error:', error);
      setReindexError(error instanceof Error ? error.message : 'Failed to reindex');
    } finally {
      setIsReindexing(false);
    }
  }, [podcastId]);

  const getStepStatus = (stepIndex: number): StepStatus => {
    if (status === 'error') {
      if (stepIndex < currentStepIndex || currentStepIndex === -1) {
        return stepIndex === 0 ? 'completed' : 'error';
      }
      return 'pending';
    }
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="relative">
      {showConfetti && <Confetti />}

      {status === 'ready' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <PartyPopper className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-medium text-emerald-500">Processing Complete!</h3>
            <p className="text-sm text-muted-foreground">
              Your podcast is ready. Start chatting with your content!
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Processing Failed</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              {errorMessage || 'An error occurred while processing your podcast.'}
            </p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Processing
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isStuck && status === 'processing' && podcastId && (
        <Alert className="mb-6 bg-amber-500/10 border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-500">Processing Seems Stuck</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3 text-muted-foreground">
              Indexing is taking longer than expected. This can happen due to server timeouts.
            </p>
            {reindexError && (
              <p className="mb-3 text-destructive text-sm">{reindexError}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReindex}
              disabled={isReindexing}
            >
              {isReindexing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reindexing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Indexing
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-0">
        {steps.map((step, index) => (
          <StepIndicator
            key={step.id}
            step={step}
            status={getStepStatus(index)}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>

      {status !== 'ready' && status !== 'error' && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="text-primary font-medium">
              {Math.round((currentStepIndex / (steps.length - 1)) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{
                width: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
