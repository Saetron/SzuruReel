import React, { useState, useEffect, useCallback } from 'react';
import { SzuruPool, SzuruPoolCategory, SzuruPost } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import {
  FolderOpen,
  Plus,
  Search,
  Sparkles,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  Trash2,
  Edit3,
  X,
  Play,
  Check,
} from 'lucide-react';

interface PoolsViewProps {
  onOpenPost: (postId: number) => void;
  onOpenInReel: (postId: number) => void;
}

export const PoolsView: React.FC<PoolsViewProps> = ({ onOpenPost, onOpenInReel }) => {
  const { api, showToast, selectedPoolId, setSelectedPoolId } = useSzuru();

  const [pools, setPools] = useState<SzuruPool[]>([]);
  const [categories, setCategories] = useState<SzuruPoolCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Pool detail state
  const [activePool, setActivePool] = useState<SzuruPool | null>(null);
  const [isLoadingPoolDetail, setIsLoadingPoolDetail] = useState(false);

  // Create pool modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCategory, setCreateCategory] = useState('series');
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPostIds, setCreatePostIds] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const fetchPools = useCallback(async () => {
    setIsLoading(true);
    try {
      const [poolRes, catRes] = await Promise.all([
        api.getPools({ query: search.trim(), limit: 50 }),
        api.getPoolCategories().catch(() => []),
      ]);
      setPools(poolRes.results);
      setCategories(catRes);
    } catch (err: any) {
      showToast(`Failed to load pools: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [api, search, showToast]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  // Load single pool detail if selectedPoolId changes or pool clicked
  useEffect(() => {
    if (selectedPoolId) {
      setIsLoadingPoolDetail(true);
      api
        .getPool(selectedPoolId)
        .then((p) => {
          setActivePool(p);
        })
        .catch((err: any) => {
          showToast(`Failed to load pool: ${err.message}`, 'error');
          setActivePool(null);
        })
        .finally(() => {
          setIsLoadingPoolDetail(false);
        });
    } else {
      setActivePool(null);
    }
  }, [selectedPoolId, api, showToast]);

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      showToast('Pool name is required', 'error');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const parsedIds = createPostIds
        .split(/[,\s]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      const created = await api.createPool({
        category: createCategory,
        names: [createName.trim()],
        description: createDesc.trim() || undefined,
        postIds: parsedIds.length > 0 ? parsedIds : undefined,
      });

      showToast(`Pool "${createName}" created!`, 'success');
      setIsCreateOpen(false);
      setCreateName('');
      setCreateDesc('');
      setCreatePostIds('');
      fetchPools();
      setSelectedPoolId(created.id);
    } catch (err: any) {
      showToast(`Failed to create pool: ${err.message}`, 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleDeletePool = async (pool: SzuruPool) => {
    if (!confirm(`Are you sure you want to delete pool "${pool.names[0]}"?`)) return;
    try {
      await api.deletePool(pool.id, pool.version);
      showToast('Pool deleted', 'success');
      setSelectedPoolId(null);
      setActivePool(null);
      fetchPools();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const filteredPools = pools.filter((p) => {
    if (activeCategory === 'all') return true;
    return p.category.toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* View: Single Pool Detail */}
      {activePool ? (
        <div className="space-y-6 animate-fade-in">
          {/* Back button and actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedPoolId(null);
                setActivePool(null);
              }}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center space-x-1"
            >
              <span>← Back to all pools</span>
            </button>

            <button
              onClick={() => handleDeletePool(activePool)}
              className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Pool</span>
            </button>
          </div>

          {/* Pool Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {activePool.category}
              </span>
              <span className="text-xs text-slate-500 font-mono">Pool #{activePool.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{activePool.names[0]}</h1>
            {activePool.description && (
              <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">
                {activePool.description}
              </p>
            )}
            <div className="flex items-center space-x-4 mt-4 text-xs text-slate-400">
              <span className="flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-pink-400" />
                <span>{activePool.posts.length} posts</span>
              </span>
            </div>
          </div>

          {/* Posts Gallery in Pool */}
          {isLoadingPoolDetail ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            </div>
          ) : activePool.posts.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <p>No posts in this pool yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {activePool.posts.map((postItem, idx) => {
                const postId = typeof postItem === 'object' ? postItem.id : postItem;
                const thumb =
                  typeof postItem === 'object' && 'thumbnailUrl' in postItem
                    ? api.resolveMediaUrl(postItem.thumbnailUrl || (postItem as any).contentUrl)
                    : null;

                return (
                  <div
                    key={postId}
                    className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700 transition"
                  >
                    <div
                      className="aspect-[3/4] bg-slate-950 relative cursor-pointer overflow-hidden"
                      onClick={() => onOpenPost(postId)}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={`Post #${postId}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                          #{postId}
                        </div>
                      )}

                      {/* Index badge */}
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white">
                        #{idx + 1}
                      </div>

                      {/* Hover Watch in Reel */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInReel(postId);
                          }}
                          className="w-full py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center justify-center space-x-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Watch</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Post #{postId}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* View: Pools Directory List */
        <div className="space-y-6">
          {/* Top Title & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center space-x-2">
                <FolderOpen className="w-6 h-6 text-pink-500" />
                <span>Pools & Collections</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Explore ordered albums, series, and story arcs across posts
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchPools();
                  }}
                  placeholder="Search pools..."
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-pink-500"
                />
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-pink-500/20 shrink-0 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Pool</span>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                activeCategory === 'all'
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => setActiveCategory(c.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                  activeCategory === c.name
                    ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Pools Grid */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            </div>
          ) : filteredPools.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">No pools found</p>
              <p className="text-xs text-slate-500 mt-1">Create a new pool to start grouping related posts together.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredPools.map((pool) => {
                const postCount = pool.postCount || pool.posts?.length || 0;
                const firstPost = pool.posts?.[0];
                const coverThumb =
                  firstPost && typeof firstPost === 'object' && 'thumbnailUrl' in firstPost
                    ? api.resolveMediaUrl(firstPost.thumbnailUrl || (firstPost as any).contentUrl)
                    : null;

                return (
                  <div
                    key={pool.id}
                    onClick={() => setSelectedPoolId(pool.id)}
                    className="group bg-slate-900/90 border border-slate-800 hover:border-pink-500/40 rounded-2xl p-4 shadow-xl cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {pool.category}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">#{pool.id}</span>
                      </div>

                      <h3 className="font-bold text-base text-white group-hover:text-pink-400 transition-colors line-clamp-1">
                        {pool.names[0]}
                      </h3>

                      {pool.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {pool.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs text-slate-400">
                      <span className="flex items-center space-x-1.5 font-semibold text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-pink-400" />
                        <span>{postCount} {postCount === 1 ? 'post' : 'posts'}</span>
                      </span>

                      <span className="flex items-center space-x-1 text-pink-400 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                        <span>View Pool</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Pool Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsCreateOpen(false)} />

          <div
            className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <h2 className="font-bold text-base text-white flex items-center space-x-2">
                <FolderOpen className="w-5 h-5 text-pink-500" />
                <span>Create New Pool</span>
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePool} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Pool Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Cyberpunk Manga Chapter 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category</label>
                <input
                  type="text"
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  placeholder="series, collection, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description (Optional)</label>
                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Describe this collection..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500 h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Initial Post IDs (Optional, comma or space separated)
                </label>
                <input
                  type="text"
                  value={createPostIds}
                  onChange={(e) => setCreatePostIds(e.target.value)}
                  placeholder="101, 102, 103"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingCreate || !createName.trim()}
                  className="w-full py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-pink-500/30 flex items-center justify-center space-x-1.5 transition"
                >
                  {isSubmittingCreate ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Create Pool</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
