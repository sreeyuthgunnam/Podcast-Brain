/**
 * Library Page Client Component
 * - Search, filter, and sort podcasts
 * - Responsive grid of PodcastCards
 * - Empty states and loading skeletons
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Upload,
  ChevronDown,
  X,
  Mic,
  RefreshCw,
} from 'lucide-react';
import { PodcastCard } from '@/components/podcast/podcast-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { showSuccess, showError } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { Podcast, PodcastStatus } from '@/types';

// ============================================================================
// Types
// ============================================================================

type SortOption = 'newest' | 'oldest' | 'title-asc';
type StatusFilter = 'all' | PodcastStatus;

interface FilterState {
  search: string;
  status: StatusFilter;
  sort: SortOption;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'error', label: 'Error' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title-asc', label: 'Title A-Z' },
];

const ITEMS_PER_PAGE = 12;

// ============================================================================
// Custom Hook: useDebounce
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// Component
// ============================================================================

export function LibraryPageClient() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    sort: 'newest',
  });

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 300);

  // Fetch podcasts
  const fetchPodcasts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/podcasts');
      if (!response.ok) {
        throw new Error('Failed to fetch podcasts');
      }
      const data = await response.json();
      setPodcasts(data.podcasts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/podcasts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete podcast');
      }

      // Remove from local state
      setPodcasts((prev) => prev.filter((p) => p.id !== id));
      
      // Show success toast
      showSuccess('Podcast deleted', 'The podcast has been permanently removed.');
    } catch (err) {
      console.error('Delete error:', err);
      showError('Failed to delete podcast', 'Please try again.');
    }
  };

  // Filter and sort podcasts
  const filteredPodcasts = podcasts
    .filter((podcast) => {
      // Status filter
      if (filters.status !== 'all') {
        // Handle 'processing' as umbrella for uploading, transcribing, processing
        if (filters.status === 'processing') {
          if (!['uploading', 'transcribing', 'processing'].includes(podcast.status)) {
            return false;
          }
        } else if (podcast.status !== filters.status) {
          return false;
        }
      }

      // Search filter
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesTitle = podcast.title.toLowerCase().includes(searchLower);
        const matchesDescription = podcast.description?.toLowerCase().includes(searchLower);
        const matchesTopics = podcast.topics?.some((t) =>
          t.toLowerCase().includes(searchLower)
        );
        if (!matchesTitle && !matchesDescription && !matchesTopics) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      switch (filters.sort) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const displayedPodcasts = filteredPodcasts.slice(0, displayCount);
  const hasMore = displayCount < filteredPodcasts.length;

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const clearSearch = () => {
    setFilters((prev) => ({ ...prev, search: '' }));
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header />
        <FilterBar filters={filters} setFilters={setFilters} disabled />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <PodcastCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-destructive mb-4">
            <RefreshCw className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Failed to load podcasts</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchPodcasts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Empty library state
  if (podcasts.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyLibrary />
      </div>
    );
  }

  // Empty search results
  if (filteredPodcasts.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          statusDropdownOpen={statusDropdownOpen}
          setStatusDropdownOpen={setStatusDropdownOpen}
          sortDropdownOpen={sortDropdownOpen}
          setSortDropdownOpen={setSortDropdownOpen}
        />
        <EmptySearch onClear={clearSearch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        statusDropdownOpen={statusDropdownOpen}
        setStatusDropdownOpen={setStatusDropdownOpen}
        sortDropdownOpen={sortDropdownOpen}
        setSortDropdownOpen={setSortDropdownOpen}
      />

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {displayedPodcasts.length} of {filteredPodcasts.length} podcasts
      </p>

      {/* Podcast Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedPodcasts.map((podcast) => (
          <PodcastCard
            key={podcast.id}
            podcast={podcast}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={handleLoadMore}>
            Load More ({filteredPodcasts.length - displayCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function Header() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">My Library</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Manage and explore your podcast collection
        </p>
      </div>
      <Link href="/upload">
        <Button className="w-full sm:w-auto min-h-[44px]">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </Link>
    </div>
  );
}

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  disabled?: boolean;
  statusDropdownOpen?: boolean;
  setStatusDropdownOpen?: (open: boolean) => void;
  sortDropdownOpen?: boolean;
  setSortDropdownOpen?: (open: boolean) => void;
}

function FilterBar({
  filters,
  setFilters,
  disabled,
  statusDropdownOpen = false,
  setStatusDropdownOpen,
  sortDropdownOpen = false,
  setSortDropdownOpen,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search podcasts..."
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          disabled={disabled}
          className={cn(
            'w-full pl-10 pr-10 py-2.5 sm:py-2 rounded-lg border bg-background min-h-[44px]',
            'text-sm placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
        {filters.search && (
          <button
            onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="relative">
        <button
          onClick={() => setStatusDropdownOpen?.(!statusDropdownOpen)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg border bg-background min-h-[44px]',
            'text-sm min-w-[140px] justify-between',
            'hover:bg-muted active:bg-muted/80 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <span>
            {STATUS_OPTIONS.find((o) => o.value === filters.status)?.label}
          </span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', statusDropdownOpen && 'rotate-180')} />
        </button>

        {statusDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setStatusDropdownOpen?.(false)}
            />
            <div className="absolute right-0 mt-2 w-40 rounded-lg border bg-background shadow-lg z-20 py-1">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, status: option.value }));
                    setStatusDropdownOpen?.(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2.5 sm:py-2 text-sm text-left hover:bg-muted active:bg-muted/80 transition-colors min-h-[44px]',
                    filters.status === option.value && 'bg-primary/5 text-primary'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sort Dropdown */}
      <div className="relative">
        <button
          onClick={() => setSortDropdownOpen?.(!sortDropdownOpen)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg border bg-background min-h-[44px]',
            'text-sm min-w-[140px] justify-between',
            'hover:bg-muted active:bg-muted/80 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <span>
            {SORT_OPTIONS.find((o) => o.value === filters.sort)?.label}
          </span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', sortDropdownOpen && 'rotate-180')} />
        </button>

        {sortDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setSortDropdownOpen?.(false)}
            />
            <div className="absolute right-0 mt-2 w-40 rounded-lg border bg-background shadow-lg z-20 py-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, sort: option.value }));
                    setSortDropdownOpen?.(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2.5 sm:py-2 text-sm text-left hover:bg-muted active:bg-muted/80 transition-colors min-h-[44px]',
                    filters.sort === option.value && 'bg-primary/5 text-primary'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Mic className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Your library is empty</h2>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Upload your first podcast to get started. Our AI will transcribe it and
        make it searchable.
      </p>
      <Link href="/upload">
        <Button size="lg">
          <Upload className="w-5 h-5 mr-2" />
          Upload Your First Podcast
        </Button>
      </Link>
    </div>
  );
}

interface EmptySearchProps {
  onClear: () => void;
}

function EmptySearch({ onClear }: EmptySearchProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No podcasts match your search</h2>
      <p className="text-muted-foreground text-center mb-4">
        Try a different search term or adjust your filters
      </p>
      <Button variant="outline" onClick={onClear}>
        <X className="w-4 h-4 mr-2" />
        Clear Search
      </Button>
    </div>
  );
}

function PodcastCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Thumbnail skeleton */}
      <div className="h-32 bg-muted animate-pulse" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-6 bg-muted rounded animate-pulse w-3/4" />

        {/* Meta */}
        <div className="flex gap-4">
          <div className="h-4 bg-muted rounded animate-pulse w-16" />
          <div className="h-4 bg-muted rounded animate-pulse w-20" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
          <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
        </div>

        {/* Tags */}
        <div className="flex gap-2">
          <div className="h-5 bg-muted rounded animate-pulse w-16" />
          <div className="h-5 bg-muted rounded animate-pulse w-20" />
        </div>
      </div>
    </Card>
  );
}
