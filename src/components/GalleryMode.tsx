import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PostSafety, SzuruPost, SzuruTag } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import {
  Search,
  SlidersHorizontal,
  Play,
  Heart,
  MessageSquare,
  Sparkles,
  ArrowUp,
  Loader2,
  Film,
  Image as ImageIcon,
  X,
  Server,
  Settings as SettingsIcon,
} from 'lucide-react';

interface GalleryModeProps {
  onOpenDetails: (post: SzuruPost) => void;
  onOpenInReel: (postId: number) => void;
}

export const GalleryMode: React.FC<GalleryModeProps> = ({
  onOpenDetails,
  onOpenInReel,
}) => {
  const {
    api,
    searchQuery,
    setSearchQuery,
    safetyFilter,
    setSafetyFilter,
    connectionStatus,
    setIsSettingsOpen,
    showToast,
    setGalleryPosts,
    setLoadMoreGalleryPosts,
  } = useSzuru();

  const [posts, setPosts] = useState<SzuruPost[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [mediaType, setMediaType] = useState<'all' | 'video' | 'image'>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Responsive column count to maintain strict left-to-right reading & sort order
  const [columnCount, setColumnCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 4;
    const w = window.innerWidth;
    if (w < 640) return 2;
    if (w < 768) return 3;
    if (w < 1024) return 4;
    if (w < 1280) return 5;
    return 6;
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      let count = 6;
      if (w < 640) count = 2;
      else if (w < 768) count = 3;
      else if (w < 1024) count = 4;
      else if (w < 1280) count = 5;
      setColumnCount(count);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Distribute posts across columns round-robin so sort order is strictly preserved left-to-right
  const columns = useMemo(() => {
    const cols: SzuruPost[][] = Array.from({ length: columnCount }, () => []);
    posts.forEach((post, i) => {
      cols[i % columnCount].push(post);
    });
    return cols;
  }, [posts, columnCount]);

  // Tag autocomplete state
  const [suggestions, setSuggestions] = useState<SzuruTag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = useCallback(
    async (offset = 0, reset = false) => {
      setIsLoading(true);
      try {
        let q = searchQuery.trim();
        if (mediaType === 'video') q = q ? `${q} type:video` : 'type:video';
        if (mediaType === 'image') q = q ? `${q} type:image` : 'type:image';
        if (sortBy && sortBy !== 'date-desc') {
          q = q ? `${q} sort:${sortBy}` : `sort:${sortBy}`;
        }

        const res = await api.getPosts({
          query: q,
          offset,
          limit: 24,
          safety: safetyFilter,
        });

        if (reset) {
          setPosts(res.results);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newResults = res.results.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newResults];
          });
        }

        setTotal(res.total);
        setHasMore(offset + res.results.length < res.total);
      } catch (err: any) {
        showToast(`Failed to load gallery: ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [api, searchQuery, mediaType, sortBy, safetyFilter, showToast]
  );

  useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

  // Sync loaded posts with context for post detail next/prev navigation
  useEffect(() => {
    setGalleryPosts(posts);
  }, [posts, setGalleryPosts]);

  // Expose loadMore function to context for next-post keyboard scrolling
  useEffect(() => {
    if (hasMore && !isLoading) {
      setLoadMoreGalleryPosts(() => () => fetchPosts(posts.length));
    } else {
      setLoadMoreGalleryPosts(null);
    }
  }, [hasMore, isLoading, posts.length, fetchPosts, setLoadMoreGalleryPosts]);

  // Infinite Scroll IntersectionObserver
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchPosts(posts.length);
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoading, posts.length, fetchPosts]);

  // Handle tag autocomplete
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    // Look at last token for tag suggestions
    const tokens = val.split(' ');
    const currentToken = tokens[tokens.length - 1];

    if (currentToken && currentToken.length >= 2) {
      try {
        const tags = await api.searchTags(currentToken, 8);
        setSuggestions(tags);
        setShowSuggestions(tags.length > 0);
      } catch {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const applyTagSuggestion = (tagName: string) => {
    const tokens = searchQuery.split(' ');
    tokens[tokens.length - 1] = tagName;
    const newQuery = tokens.join(' ') + ' ';
    setSearchQuery(newQuery);
    setShowSuggestions(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0c0d14] text-slate-100 pb-24">
      {/* Search and Filter Header */}
      <div className="sticky top-16 z-30 bg-[#0c0d14]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <div className="flex items-center bg-slate-900/90 border border-slate-700/60 rounded-xl px-3.5 py-2.5 shadow-inner focus-within:border-pink-500/80 focus-within:ring-2 focus-within:ring-pink-500/20 transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowSuggestions(false);
                    fetchPosts(0, true);
                  }
                }}
                placeholder="Search tags (e.g. cyberpunk, studio_trigger, rating:safe)..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Autocomplete suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/70 rounded-xl shadow-2xl overflow-hidden z-40 animate-fade-in divide-y divide-slate-800">
                {suggestions.map((tag) => (
                  <button
                    key={tag.names[0]}
                    onClick={() => applyTagSuggestion(tag.names[0])}
                    className="w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-800 transition-colors"
                  >
                    <span className="font-semibold text-slate-200">
                      #{tag.names[0]}
                    </span>
                    <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                      {tag.usages} {tag.usages === 1 ? 'post' : 'posts'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Filters / Toggle Bar */}
          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto no-scrollbar py-1">
            {/* Media Type Chips */}
            <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setMediaType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  mediaType === 'all'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setMediaType('video')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  mediaType === 'video'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Reels/Videos</span>
              </button>
              <button
                onClick={() => setMediaType('image')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  mediaType === 'image'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Images</span>
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl border transition-colors shrink-0 ${
                showFilters
                  ? 'bg-pink-500/20 text-pink-400 border-pink-500/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
              }`}
              title="Toggle filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded Filters Drawer */}
        {showFilters && (
          <div className="max-w-7xl mx-auto pt-3 border-t border-slate-800/80 mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs animate-fade-in">
            {/* Safety Rating */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Safety Filter</label>
              <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {(['all', 'safe', 'sketchy', 'unsafe'] as (PostSafety | 'all')[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSafetyFilter(s)}
                    className={`py-1 text-center font-semibold rounded-lg uppercase tracking-wider text-[10px] transition ${
                      safetyFilter === s
                        ? 'bg-pink-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort order */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-pink-500"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="score-desc">Top Score</option>
                <option value="random">Random</option>
              </select>
            </div>

            {/* Results count */}
            <div className="flex flex-col justify-end">
              <span className="text-slate-400 text-xs">
                Found <span className="text-white font-bold">{total}</span> posts
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        {!isLoading && connectionStatus === 'unconfigured' && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500 mb-4 shadow-lg shadow-pink-500/10">
              <Server className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">Connect to Szurubooru</h3>
            <p className="text-xs text-slate-400 max-w-md mt-2 leading-relaxed">
              Set the <code className="text-pink-400 font-mono">SZURU_URL</code> environment variable in your Docker container or enter your instance URL in settings.
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

        {posts.length === 0 && !isLoading && connectionStatus !== 'unconfigured' && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <Sparkles className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No posts found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search tags or safety filters.
            </p>
          </div>
        )}

        <div
          className="grid gap-3 sm:gap-4 items-start w-full"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          }}
        >
          {columns.map((colPosts, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-3 sm:gap-4 min-w-0">
              {colPosts.map((post) => {
                const isVideo =
                  post.type === 'video' ||
                  post.mimeType?.startsWith('video/') ||
                  post.contentUrl.endsWith('.mp4') ||
                  post.contentUrl.endsWith('.webm');
                const thumb = api.resolveMediaUrl(post.thumbnailUrl || post.contentUrl);

                return (
                  <div
                    key={post.id}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenDetails(post);
                      }
                    }}
                    className="group relative bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg hover:shadow-pink-500/10 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all duration-300 flex flex-col"
                  >
                    {/* Media thumbnail */}
                    <div
                      className="relative w-full bg-slate-950 overflow-hidden cursor-pointer"
                      style={{
                        aspectRatio:
                          post.canvasWidth && post.canvasHeight
                            ? `${post.canvasWidth} / ${post.canvasHeight}`
                            : '1 / 1',
                        maxHeight: '650px',
                      }}
                      onClick={() => onOpenDetails(post)}
                    >
                      <img
                        src={thumb}
                        alt={`Post #${post.id}`}
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Video Badge */}
                      {isVideo && (
                        <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white px-2 py-0.5 rounded-full flex items-center space-x-1 text-[10px] font-bold shadow-md">
                          <Film className="w-3 h-3 text-pink-400" />
                          <span>Reel</span>
                        </div>
                      )}

                      {/* Safety badge */}
                      {post.safety !== 'safe' && (
                        <div
                          className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-md shadow-md ${
                            post.safety === 'sketchy'
                              ? 'bg-amber-500/80 text-black'
                              : 'bg-rose-600/80 text-white'
                          }`}
                        >
                          {post.safety}
                        </div>
                      )}

                      {/* Overlay action on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInReel(post.id);
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-lg shadow-pink-500/25 transition-transform active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Watch in Reel</span>
                        </button>
                      </div>
                    </div>

                    {/* Card footer details */}
                    <div className="p-2.5 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 bg-slate-900/40">
                      <span className="font-semibold text-slate-300 truncate max-w-[80px]">
                        #{post.id}
                      </span>
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center space-x-1 text-slate-400">
                          <Heart className="w-3 h-3 text-pink-400/80" />
                          <span>{post.score}</span>
                        </span>
                        <span className="flex items-center space-x-1 text-slate-400">
                          <MessageSquare className="w-3 h-3 text-slate-400" />
                          <span>{post.comments?.length || 0}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Infinite Scroll Sentinel & Loading Indicator */}
        <div ref={observerTarget} className="mt-8 mb-4 flex flex-col items-center justify-center min-h-[50px]">
          {isLoading && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs py-2 px-4 rounded-full bg-slate-900/80 border border-slate-800 shadow-md">
              <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
              <span>Loading more posts...</span>
            </div>
          )}
          {!hasMore && posts.length > 0 && !isLoading && (
            <span className="text-xs text-slate-500 select-none">You've reached the end</span>
          )}
        </div>
      </div>

      {/* Floating scroll to top button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-2xl backdrop-blur-md transition-all active:scale-90 z-20"
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </div>
  );
};
