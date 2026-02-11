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

export const metadata: Metadata = {
  title: 'Upload Podcast',
  description: 'Upload your podcast audio files for AI-powered transcription and chat.',
};

const tips = [
  { icon: FileAudio, title: 'Supported Formats', description: 'MP3, WAV, M4A, OGG, and WebM audio files' },
  { icon: HardDrive, title: 'Maximum File Size', description: '100MB per file' },
  { icon: Clock, title: 'Processing Time', description: 'Longer episodes may take a few minutes to transcribe' },
  { icon: Bell, title: 'Notifications', description: "You'll be notified when processing is complete" },
];

const features = [
  'AI-powered transcription',
  'Automatic topic extraction',
  'Smart summaries',
  'Chat with your content',
];

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Upload Podcast</h1>
        <p className="text-muted-foreground mt-1">
          Upload your audio file to get started with AI transcription
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <PodcastUploader />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Upload Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tips.map((tip) => {
                const Icon = tip.icon;
                return (
                  <div key={tip.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tip.title}</p>
                      <p className="text-sm text-muted-foreground">{tip.description}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">What happens next?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
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
