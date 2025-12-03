/**
 * Processing Status Component
 * 
 * Shows the podcast processing pipeline status as a vertical stepper:
 * 1. Upload Complete
 * 2. Transcribing Audio
 * 3. Generating Summary
 * 4. Indexing for Search
 * 5. Ready to Chat!
 * 
 * Includes animations, error handling, and retry functionality.
 */

'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { PodcastStatus } from '@/types';

// ============================================
// TYPES
// ============================================

interface ProcessingStatusProps {
  status: PodcastStatus;
  errorMessage?: string;
  onRetry?: () => void;
}

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  estimatedTime?: string;
}

type StepStatus = 'completed' | 'current' | 'pending' | 'error';

// ============================================
// CONSTANTS
// ============================================

const steps: Step[] = [
  {
    id: 'upload',
    label: 'Upload Complete',
    description: 'Audio file uploaded successfully',
    icon: Upload,
  },
  {
    id: 'transcribe',
    label: 'Transcribing Audio',
    description: 'Converting speech to text with AI',
    icon: FileAudio,
    estimatedTime: '2-5 minutes',
  },
  {
    id: 'summary',
    label: 'Generating Summary',
    description: 'Creating summary and extracting topics',
    icon: Sparkles,
    estimatedTime: '30 seconds',
  },
  {
    id: 'index',
    label: 'Indexing for Search',
    description: 'Creating embeddings for semantic search',
    icon: Search,
    estimatedTime: '1 minute',
  },
  {
    id: 'ready',
    label: 'Ready to Chat!',
    description: 'Your podcast is ready for AI-powered chat',
    icon: MessageSquare,
  },
];

/**
 * Map podcast status to step index
 */
function getStepIndex(status: PodcastStatus): number {
  switch (status) {
    case 'uploading':
      return 0; // Currently at upload step
    case 'transcribing':
      return 1; // Currently at transcribe step
    case 'processing':
      return 3; // Currently at index step (summary is included in transcribing)
    case 'ready':
      return 5; // All steps complete
    case 'error':
      return -1; // Error state
    default:
      return 0;
  }
}

// ============================================
// CONFETTI ANIMATION COMPONENT
// ============================================

function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
    }));
    setParticles(newParticles);
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
            backgroundColor: ['#a855f7', '#ec4899', '#3b82f6', '#22c55e', '#eab308'][
              particle.id % 5
            ],
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// STEP INDICATOR COMPONENT
// ============================================

interface StepIndicatorProps {
  step: Step;
  status: StepStatus;
  isLast: boolean;
}

function StepIndicator({ step, status, isLast }: StepIndicatorProps) {
  const Icon = step.icon;

  return (
    <div className="flex gap-4">
      {/* Indicator Column */}
      <div className="flex flex-col items-center">
        {/* Circle/Icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500',
            status === 'completed' && 'bg-green-500/20 text-green-400',
            status === 'current' && 'bg-purple-500/20 text-purple-400 animate-pulse',
            status === 'pending' && 'bg-white/5 text-gray-500',
            status === 'error' && 'bg-red-500/20 text-red-400'
          )}
        >
          {status === 'completed' && <Check className="h-5 w-5" />}
          {status === 'current' && <Loader2 className="h-5 w-5 animate-spin" />}
          {status === 'pending' && <Circle className="h-5 w-5" />}
          {status === 'error' && <AlertCircle className="h-5 w-5" />}
        </div>

        {/* Connecting Line */}
        {!isLast && (
          <div
            className={cn(
              'w-0.5 h-12 mt-2 transition-all duration-500',
              status === 'completed' && 'bg-green-500/50',
              status === 'current' && 'bg-gradient-to-b from-purple-500/50 to-gray-700',
              status === 'pending' && 'bg-gray-700 border-l border-dashed border-gray-600',
              status === 'error' && 'bg-red-500/50'
            )}
          />
        )}
      </div>

      {/* Content Column */}
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              'h-4 w-4',
              status === 'completed' && 'text-green-400',
              status === 'current' && 'text-purple-400',
              status === 'pending' && 'text-gray-500',
              status === 'error' && 'text-red-400'
            )}
          />
          <h3
            className={cn(
              'font-medium',
              status === 'completed' && 'text-green-400',
              status === 'current' && 'text-white',
              status === 'pending' && 'text-gray-500',
              status === 'error' && 'text-red-400'
            )}
          >
            {step.label}
          </h3>
        </div>
        <p
          className={cn(
            'text-sm mt-1',
            status === 'pending' ? 'text-gray-600' : 'text-gray-400'
          )}
        >
          {step.description}
        </p>
        {status === 'current' && step.estimatedTime && (
          <p className="text-xs text-purple-300 mt-2">
            Estimated time: {step.estimatedTime}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// PROCESSING STATUS COMPONENT
// ============================================

export function ProcessingStatus({
  status,
  errorMessage,
  onRetry,
}: ProcessingStatusProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const currentStepIndex = getStepIndex(status);

  // Trigger confetti when status becomes 'ready'
  useEffect(() => {
    if (status === 'ready') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  /**
   * Determine step status based on current processing status
   */
  const getStepStatus = (stepIndex: number): StepStatus => {
    if (status === 'error') {
      // For error state, mark completed steps and show error at current
      if (stepIndex < currentStepIndex || currentStepIndex === -1) {
        // Guess where error occurred based on status history
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
      {/* Confetti Animation */}
      {showConfetti && <Confetti />}

      {/* Success Banner */}
      {status === 'ready' && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <PartyPopper className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-medium text-green-400">Processing Complete!</h3>
            <p className="text-sm text-gray-400">
              Your podcast is ready. Start chatting with your content!
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {status === 'error' && (
        <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Processing Failed</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              {errorMessage || 'An error occurred while processing your podcast.'}
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="border-red-500/30 text-red-300 hover:bg-red-500/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Processing
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Steps */}
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

      {/* Overall Progress */}
      {status !== 'ready' && status !== 'error' && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Overall Progress</span>
            <span className="text-purple-300">
              {Math.round((currentStepIndex / (steps.length - 1)) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
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
