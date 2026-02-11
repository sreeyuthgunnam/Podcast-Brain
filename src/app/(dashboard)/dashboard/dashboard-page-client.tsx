'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mic,
  Clock,
  Database,
  MessageSquare,
  Upload,
  Library,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatRelativeTime, truncateText } from '@/lib/utils';
import type { Podcast, ChatMessage, PodcastStatus } from '@/types';

interface StatsData {
  totalPodcasts: number;
  totalDuration: number;
  totalChunks: number;
  totalChats: number;
  podcastsByStatus: {
    uploading: number;
    transcribing: number;
    processing: number;
    ready: number;
    error: number;
  };
  recentPodcasts: Podcast[];
  recentChats: ChatMessage[];
}

export function DashboardPageClient() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Get current date
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate processing podcasts
  const processingPodcasts = stats?.recentPodcasts.filter((p) =>
    ['uploading', 'transcribing', 'processing'].includes(p.status)
  ) || [];

  const hasProcessing = processingPodcasts.length > 0;
  const showGettingStarted = (stats?.totalPodcasts || 0) < 3;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchStats}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground text-sm sm:text-base">{today}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Podcasts"
          value={stats?.totalPodcasts || 0}
          icon={Mic}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Total Hours"
          value={formatHours(stats?.totalDuration || 0)}
          icon={Clock}
          iconColor="text-sky-500"
          iconBg="bg-sky-500/10"
        />
        <StatCard
          title="Indexed Chunks"
          value={stats?.totalChunks || 0}
          icon={Database}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          title="Chat Messages"
          value={stats?.totalChats || 0}
          icon={MessageSquare}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* Processing Queue */}
      {hasProcessing && (
        <section>
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Currently Processing</h2>
          <div className="space-y-3">
            {processingPodcasts.map((podcast) => (
              <ProcessingItem key={podcast.id} podcast={podcast} />
            ))}
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Podcasts */}
        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Recent Uploads</h2>
            <Link
              href="/library"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              {stats?.recentPodcasts && stats.recentPodcasts.length > 0 ? (
                <div className="divide-y">
                  {stats.recentPodcasts.slice(0, 5).map((podcast) => (
                    <RecentPodcastItem key={podcast.id} podcast={podcast} />
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No podcasts yet. Upload your first one!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Recent Chats */}
        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Recent Chats</h2>
            <Link
              href="/chat"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              {stats?.recentChats && stats.recentChats.length > 0 ? (
                <div className="divide-y">
                  {stats.recentChats.slice(0, 5).map((chat) => (
                    <RecentChatItem key={chat.id} chat={chat} />
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No chats yet. Start a conversation!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <QuickActionCard
            href="/upload"
            icon={Upload}
            title="Upload Podcast"
            description="Add a new podcast to your library"
            iconColor="text-primary"
            iconBg="bg-primary/10"
          />
          <QuickActionCard
            href="/library"
            icon={Library}
            title="Browse Library"
            description="Explore your podcast collection"
            iconColor="text-sky-500"
            iconBg="bg-sky-500/10"
          />
          <QuickActionCard
            href="/chat"
            icon={Sparkles}
            title="Start Chatting"
            description="Ask AI about your podcasts"
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10"
          />
        </div>
      </section>

      {/* Getting Started */}
      {showGettingStarted && (
        <section>
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Getting Started</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <ChecklistItem
                  checked={(stats?.totalPodcasts || 0) >= 1}
                  text="Upload your first podcast"
                />
                <ChecklistItem
                  checked={(stats?.podcastsByStatus?.ready || 0) >= 1}
                  text="Wait for processing to complete"
                />
                <ChecklistItem
                  checked={(stats?.totalChats || 0) >= 1}
                  text="Chat with your content"
                />
              </div>
              <div className="mt-6 p-4 bg-muted rounded-xl">
                <h4 className="font-medium mb-2">💡 Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Upload MP3 or WAV files up to 100MB</li>
                  <li>• Processing typically takes 2-5 minutes per hour of audio</li>
                  <li>• Chat works best with specific questions about your content</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

function StatCard({ title, value, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 sm:pt-6 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className={cn('p-2 sm:p-3 rounded-xl w-fit', iconBg)}>
            <Icon className={cn('w-5 h-5 sm:w-6 sm:h-6', iconColor)} />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold">{value}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  return hours.toFixed(1);
}

interface ProcessingItemProps {
  podcast: Podcast;
}

function ProcessingItem({ podcast }: ProcessingItemProps) {
  const statusLabels: Record<string, string> = {
    uploading: 'Uploading...',
    transcribing: 'Transcribing...',
    processing: 'Processing...',
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{podcast.title}</p>
            <p className="text-sm text-muted-foreground">
              {statusLabels[podcast.status] || podcast.status}
            </p>
          </div>
          <Link href={`/episode/${podcast.id}`}>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

interface RecentPodcastItemProps {
  podcast: Podcast;
}

function RecentPodcastItem({ podcast }: RecentPodcastItemProps) {
  const statusConfig = getStatusBadge(podcast.status);

  return (
    <Link
      href={`/episode/${podcast.id}`}
      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-muted/50 active:bg-muted transition-colors min-h-[60px]"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{podcast.title}</p>
        <p className="text-sm text-muted-foreground">
          {formatRelativeTime(podcast.created_at)}
        </p>
      </div>
      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
    </Link>
  );
}

function getStatusBadge(status: PodcastStatus): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
} {
  switch (status) {
    case 'uploading':
      return { label: 'Uploading', variant: 'warning' };
    case 'transcribing':
      return { label: 'Transcribing', variant: 'info' };
    case 'processing':
      return { label: 'Processing', variant: 'info' };
    case 'ready':
      return { label: 'Ready', variant: 'success' };
    case 'error':
      return { label: 'Error', variant: 'destructive' };
    default:
      return { label: status, variant: 'secondary' };
  }
}

interface RecentChatItemProps {
  chat: ChatMessage;
}

function RecentChatItem({ chat }: RecentChatItemProps) {
  // Get podcast title from sources if available
  const podcastTitle = chat.sources?.[0]?.podcast_title || 'Unknown podcast';

  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground mb-1">{podcastTitle}</p>
      <p className="text-sm line-clamp-2">{truncateText(chat.content, 120)}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {formatRelativeTime(chat.created_at)}
      </p>
    </div>
  );
}

interface QuickActionCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  iconColor: string;
  iconBg: string;
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  iconColor,
  iconBg,
}: QuickActionCardProps) {
  return (
    <Link href={href}>
      <Card className="h-full hover:shadow-smooth hover:-translate-y-0.5 transition-all cursor-pointer active:translate-y-0">
        <CardContent className="p-4 sm:pt-6 sm:p-6">
          <div className={cn('w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4', iconBg)}>
            <Icon className={cn('w-5 h-5 sm:w-6 sm:h-6', iconColor)} />
          </div>
          <h3 className="font-semibold mb-1 text-sm sm:text-base">{title}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

interface ChecklistItemProps {
  checked: boolean;
  text: string;
}

function ChecklistItem({ checked, text }: ChecklistItemProps) {
  return (
    <div className="flex items-center gap-3">
      {checked ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground" />
      )}
      <span className={cn(checked && 'text-muted-foreground line-through')}>
        {text}
      </span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Welcome skeleton */}
      <div>
        <div className="h-9 w-64 bg-muted rounded animate-pulse mb-2" />
        <div className="h-5 w-48 bg-muted rounded animate-pulse" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-lg animate-pulse" />
                <div>
                  <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i}>
            <div className="h-7 w-40 bg-muted rounded animate-pulse mb-4" />
            <Card>
              <CardContent className="p-0">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="p-4 border-b last:border-b-0">
                    <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div>
        <div className="h-7 w-32 bg-muted rounded animate-pulse mb-4" />
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-muted rounded-xl animate-pulse mb-4" />
                <div className="h-5 w-32 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
