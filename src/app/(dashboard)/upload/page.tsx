/**
 * Upload Page
 * 
 * Page for uploading podcast audio files:
 * - PodcastUploader component for drag & drop
 * - Tips sidebar with helpful information
 * - Responsive layout (2 columns on desktop, stacked on mobile)
 */

import { Metadata } from 'next';
import {
  FileAudio,
  HardDrive,
  Clock,
  Bell,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';

import { PodcastUploader } from '@/components/upload/podcast-uploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'Upload Podcast',
  description: 'Upload your podcast audio files for AI-powered transcription and chat.',
};

// ============================================
// TIPS DATA
// ============================================

const tips = [
  {
    icon: FileAudio,
    title: 'Supported Formats',
    description: 'MP3, WAV, M4A, OGG, and WebM audio files',
  },
  {
    icon: HardDrive,
    title: 'Maximum File Size',
    description: '100MB per file',
  },
  {
    icon: Clock,
    title: 'Processing Time',
    description: 'Longer episodes may take a few minutes to transcribe',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: "You'll be notified when processing is complete",
  },
];

const features = [
  'AI-powered transcription',
  'Automatic topic extraction',
  'Smart summaries',
  'Chat with your content',
];

// ============================================
// UPLOAD PAGE COMPONENT
// ============================================

export default function UploadPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Upload Podcast
        </h1>
        <p className="text-gray-400 mt-1">
          Upload your audio file to get started with AI transcription
        </p>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Uploader - Takes 3/5 on large screens */}
        <div className="lg:col-span-3">
          <PodcastUploader />
        </div>

        {/* Tips Sidebar - Takes 2/5 on large screens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tips Card */}
          <Card className="bg-gray-900/50 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                Upload Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tips.map((tip) => {
                const Icon = tip.icon;
                return (
                  <div key={tip.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {tip.title}
                      </p>
                      <p className="text-sm text-gray-400">{tip.description}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* What You Get Card */}
          <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">
                What happens next?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
