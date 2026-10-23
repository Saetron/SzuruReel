import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SzuruPost } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import { ReelItem } from './ReelItem';
import {
  ChevronUp,
  ChevronDown,
  Loader2,
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  Server,
  Settings as SettingsIcon,
} from 'lucide-react';

interface ReelModeProps {
  onOpenDetails: (post: SzuruPost) => void;
}

export const ReelMode: React.FC<ReelModeProps> = ({ onOpenDetails }) => {
  const {
    api,
    config,
    searchQuery,
    safetyFilter,
    reelInitialPostId,
    setReelInitialPostId,
    connectionStatus,
    setIsSettingsOpen,
    showToast,
  } = useSzuru();

  const containerRef = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<SzuruPost[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(!config.autoPlaySound);
  const [videoOnlyFilter, setVideoOnlyFilter] = useState<boolean>(false);

  // Load initial batch of posts
  const fetchPosts = useCallback(
    async (offset = 0, reset = false) => {
      setIsLoading(true);
      try {
        let q = searchQuery.trim();
        if (videoOnlyFilter) {
          q = q ? `${q} type:video` : 'type:video';
        }

        const res = await api.getPosts({
          query: q,
          offset,
          limit: 10,
          safety: safetyFilter,
        });

        if (reset) {
          setPosts(res.results);
          setActiveIndex(0);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = res.results.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });
        }

        setHasMore(offset + res.results.length < res.total);
      } catch (err: any) {
        showToast(`Failed to load reel: ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [api, searchQuery, safetyFilter, videoOnlyFilter, showToast]
  );

  useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

  // Jump to specific initial post if navigated from gallery
  useEffect(() => {
    if (reelInitialPostId && posts.length > 0) {
      const targetIdx = posts.findIndex((p) => p.id === reelInitialPostId);
      if (targetIdx !== -1) {
        setActiveIndex(targetIdx);
        scrollToIndex(targetIdx);
      }
      setReelInitialPostId(null);
    }
  }, [reelInitialPostId, posts, setReelInitialPostId]);

  // Setup Modern Web Guidance: scrollsnapchange with IntersectionObserver fallback
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Feature detect modern scrollsnapchange event (Chrome 129+, Edge 129+)
    const handleSnapChange = (e: any) => {
      const snappedElement = e.snapTargetBlock as HTMLElement | null;
      if (snappedElement && snappedElement.dataset.index) {
        const idx = parseInt(snappedElement.dataset.index, 10);
        if (!isNaN(idx)) {
          setActiveIndex(idx);
        }
      }
    };

    let cleanup = () => {};

    if ('onscrollsnapchange' in HTMLElement.prototype) {
      container.addEventListener('scrollsnapchange', handleSnapChange);
      cleanup = () => {
        container.removeEventListener('scrollsnapchange', handleSnapChange);
      };
    } else {
      // IntersectionObserver fallback
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              const target = entry.target as HTMLElement;
              const idx = parseInt(target.dataset.index || '0', 10);
              if (!isNaN(idx)) {
                setActiveIndex(idx);
              }
            }
          });
        },
        { root: container, threshold: 0.55 }
      );

      const items = container.querySelectorAll('.reel-slide');
      items.forEach((item) => observer.observe(item));

      cleanup = () => {
        observer.disconnect();
      };
    }

    return cleanup;
  }, [posts]);

  // Check if we need to load more posts
  useEffect(() => {
    if (activeIndex >= posts.length - 3 && hasMore && !isLoading) {
      fetchPosts(posts.length);
    }
  }, [activeIndex, posts.length, hasMore, isLoading, fetchPosts]);

  const scrollToIndex = (index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const target = container.querySelector(`[data-index="${index}"]`) as HTMLElement;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      scrollToIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < posts.length - 1) {
      scrollToIndex(activeIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, posts.length]);

  return (
    <div className="relative w-full h-[calc(100dvh-4rem)] bg-black overflow-hidden flex items-center justify-center">
      {/* Top filter chips (Reel Mode Controls) */}
      <div className="absolute top-4 left-4 z-30 flex items-center space-x-2 backdrop-blur-md bg-black/40 p-1.5 rounded-full border border-white/10 shadow-lg">
        <button
          onClick={() => setVideoOnlyFilter(!videoOnlyFilter)}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            videoOnlyFilter
              ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Videos Only</span>
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-1.5 rounded-full text-xs font-semibold transition-all ${
            !isMuted
              ? 'bg-emerald-500/80 text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title={isMuted ? 'Audio Muted' : 'Audio On'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Desktop Next/Prev floating control buttons */}
      <div className="hidden md:flex flex-col space-y-3 absolute right-8 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="p-3 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white border border-slate-700/50 backdrop-blur-md disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 active:scale-90 shadow-xl"
          aria-label="Previous reel"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          onClick={handleNext}
          disabled={activeIndex === posts.length - 1}
          className="p-3 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white border border-slate-700/50 backdrop-blur-md disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 active:scale-90 shadow-xl"
          aria-label="Next reel"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Main vertical scroll container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
      >
        {posts.map((post, index) => (
          <div
            key={post.id}
            data-index={index}
            className="reel-slide w-full h-full snap-start snap-always"
          >
            <ReelItem
              post={post}
              isActive={index === activeIndex}
              isMuted={isMuted}
              toggleMute={() => setIsMuted(!isMuted)}
              onOpenDetails={onOpenDetails}
            />
          </div>
        ))}

        {/* Unconfigured / Empty state */}
        {!isLoading && connectionStatus === 'unconfigured' && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500 mb-4 shadow-lg shadow-pink-500/10">
              <Server className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">Connect to Szurubooru</h3>
            <p className="text-xs text-slate-400 max-w-md mt-2 leading-relaxed">
              Set the <code className="text-pink-400 font-mono">SZURU_URL</code> environment variable in your Docker container, or click below to configure the instance URL.
            </p>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="mt-5 px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-pink-500/30 transition-transform active:scale-95"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Configure Connection</span>
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && connectionStatus !== 'unconfigured' && posts.length === 0 && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Sparkles className="w-12 h-12 text-pink-500 mb-3 animate-bounce-subtle" />
            <h3 className="text-lg font-bold text-slate-200">No posts found</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-1">
              {searchQuery
                ? `No posts matched query "${searchQuery}". Try different tags.`
                : 'Your Szurubooru has no posts matching the current safety filter.'}
            </p>
          </div>
        )}

        {/* Loading spinner */}
        {isLoading && (
          <div className="w-full h-24 flex items-center justify-center text-pink-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};
