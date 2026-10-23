import React, { useState, useEffect, useCallback } from 'react';
import { SzuruFullUser, SzuruPost } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import { X, User, Calendar, UploadCloud, Bookmark, MessageSquare, Play, Loader2, Sparkles } from 'lucide-react';

interface UserProfileModalProps {
  username: string;
  onClose: () => void;
  onOpenPost: (postId: number) => void;
  onOpenInReel: (postId: number) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  username,
  onClose,
  onOpenPost,
  onOpenInReel,
}) => {
  const { api, showToast } = useSzuru();

  const [user, setUser] = useState<SzuruFullUser | null>(null);
  const [activeTab, setActiveTab] = useState<'uploads' | 'favorites'>('uploads');
  const [posts, setPosts] = useState<SzuruPost[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  useEffect(() => {
    setIsLoadingUser(true);
    api
      .getUser(username)
      .then((data) => {
        setUser(data);
      })
      .catch((err: any) => {
        showToast(`Failed to load user: ${err.message}`, 'error');
      })
      .finally(() => {
        setIsLoadingUser(false);
      });
  }, [api, username, showToast]);

  const fetchTabPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    try {
      const q = activeTab === 'uploads' ? `uploader:${username}` : `fav:${username}`;
      const res = await api.getPosts({ query: q, limit: 30 });
      setPosts(res.results);
    } catch (err: any) {
      showToast(`Failed to load ${activeTab}: ${err.message}`, 'error');
    } finally {
      setIsLoadingPosts(false);
    }
  }, [activeTab, api, username, showToast]);

  useEffect(() => {
    if (user) {
      fetchTabPosts();
    }
  }, [user, activeTab, fetchTabPosts]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-4xl h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-pink-500" />
            <h2 className="font-bold text-base text-white">User Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        {isLoadingUser ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
          </div>
        ) : !user ? (
          <div className="text-center py-20 text-slate-400">
            <p>User "{username}" not found.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-xl shrink-0">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center text-2xl font-black text-white">
                  {user.avatarUrl ? (
                    <img src={api.resolveMediaUrl(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.slice(0, 1).toUpperCase()
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                  <h1 className="text-2xl font-black text-white">{user.name}</h1>
                  {user.rank && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      {user.rank}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 pt-1">
                  {user.creationTime && (
                    <span className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Joined {new Date(user.creationTime).toLocaleDateString()}</span>
                    </span>
                  )}
                  {user.uploadCount !== undefined && (
                    <span className="flex items-center space-x-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-pink-400" />
                      <span>{user.uploadCount} uploads</span>
                    </span>
                  )}
                  {user.favoriteCount !== undefined && (
                    <span className="flex items-center space-x-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                      <span>{user.favoriteCount} favorites</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center space-x-1 px-6 pt-3 border-b border-slate-800 bg-slate-900/60">
              <button
                onClick={() => setActiveTab('uploads')}
                className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-bold text-xs transition ${
                  activeTab === 'uploads'
                    ? 'border-pink-500 text-pink-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Uploads</span>
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-bold text-xs transition ${
                  activeTab === 'favorites'
                    ? 'border-pink-500 text-pink-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>Favorites</span>
              </button>
            </div>

            {/* Tab Posts Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingPosts ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-400">
                    No {activeTab} found for this user
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {posts.map((post) => {
                    const thumb = api.resolveMediaUrl(post.thumbnailUrl || post.contentUrl);
                    return (
                      <div
                        key={post.id}
                        className="group relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow cursor-pointer hover:border-slate-700 transition"
                        onClick={() => onOpenPost(post.id)}
                      >
                        <div className="aspect-[3/4] overflow-hidden bg-slate-900 relative">
                          <img
                            src={thumb}
                            alt={`Post #${post.id}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenInReel(post.id);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Reel</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-2 text-[11px] text-slate-400 flex items-center justify-between">
                          <span>#{post.id}</span>
                          <span className="font-semibold">{post.score} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
