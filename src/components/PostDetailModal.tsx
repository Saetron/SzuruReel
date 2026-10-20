import React, { useState } from 'react';
import { SzuruComment, SzuruPost } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import {
  X,
  Play,
  Heart,
  Bookmark,
  Download,
  ExternalLink,
  MessageSquare,
  Send,
  Calendar,
  User,
  HardDrive,
  Maximize2,
  Tag,
} from 'lucide-react';

interface PostDetailModalProps {
  post: SzuruPost;
  onClose: () => void;
  onOpenInReel: (postId: number) => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  onClose,
  onOpenInReel,
}) => {
  const { api, showToast, setSearchQuery, setActiveMode } = useSzuru();

  const [isLiked, setIsLiked] = useState<boolean>(post.ownScore === 1);
  const [score, setScore] = useState<number>(post.score);
  const [isFavorited, setIsFavorited] = useState<boolean>(!!post.ownFavorite);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<SzuruComment[]>(post.comments || []);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const isVideo =
    post.type === 'video' ||
    post.mimeType?.startsWith('video/') ||
    post.contentUrl.endsWith('.mp4') ||
    post.contentUrl.endsWith('.webm');

  const mediaUrl = api.resolveMediaUrl(post.contentUrl);

  const handleLike = async () => {
    const nextScore = isLiked ? 0 : 1;
    setIsLiked(!isLiked);
    setScore((prev) => (isLiked ? prev - 1 : prev + 1));
    try {
      await api.setScore(post.id, nextScore);
    } catch {
      setIsLiked(isLiked);
      setScore((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const handleFavorite = async () => {
    const nextState = !isFavorited;
    setIsFavorited(nextState);
    try {
      await api.setFavorite(post.id, nextState);
      showToast(nextState ? 'Added to favorites' : 'Removed from favorites', 'success');
    } catch (err: any) {
      setIsFavorited(!nextState);
      showToast(`Favorite failed: ${err.message}`, 'error');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const newComment = await api.createComment(post.id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      showToast('Comment posted!', 'success');
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleTagClick = (tagName: string) => {
    setSearchQuery(tagName);
    setActiveMode('gallery');
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Group tags by category
  const categorizedTags = React.useMemo(() => {
    const map: Record<string, typeof post.tags> = {
      artist: [],
      character: [],
      copyright: [],
      general: [],
      meta: [],
    };
    post.tags.forEach((tag) => {
      const cat = (tag.category || 'general').toLowerCase();
      if (!map[cat]) map[cat] = [];
      map[cat].push(tag);
    });
    return map;
  }, [post.tags]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-6xl h-full md:h-[90vh] bg-slate-900 border-0 md:border border-slate-800 rounded-none md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Media Area */}
        <div className="flex-1 bg-black relative flex items-center justify-center min-h-[300px] md:min-h-0">
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              loop
              className="max-h-[50vh] md:max-h-full max-w-full object-contain"
            />
          ) : (
            <img
              src={mediaUrl}
              alt={`Post #${post.id}`}
              className="max-h-[50vh] md:max-h-full max-w-full object-contain"
            />
          )}

          {/* Quick Reel Launch Button */}
          <button
            onClick={() => {
              onClose();
              onOpenInReel(post.id);
            }}
            className="absolute top-4 left-4 bg-pink-500 hover:bg-pink-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-pink-500/30 transition-transform active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Open in Reel Mode</span>
          </button>
        </div>

        {/* Right: Sidebar Details & Comments */}
        <div className="w-full md:w-96 flex flex-col bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 text-slate-100 h-[50vh] md:h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-base text-white">Post #{post.id}</h2>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  post.safety === 'safe'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : post.safety === 'sketchy'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {post.safety}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable details */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {/* Actions Bar */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLike}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 font-semibold transition ${
                  isLiked
                    ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
                <span>{score}</span>
              </button>

              <button
                onClick={handleFavorite}
                className={`p-2 rounded-xl border transition ${
                  isFavorited
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-transparent'
                }`}
                title="Favorite"
              >
                <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-amber-400' : ''}`} />
              </button>

              <a
                href={mediaUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Download original file"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>

            {/* Categorized Tags */}
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <Tag className="w-3 h-3 text-pink-400" />
                <span>Tags</span>
              </div>

              {(['artist', 'character', 'copyright', 'general', 'meta'] as const).map((cat) => {
                const list = categorizedTags[cat] || [];
                if (list.length === 0) return null;

                const catColors: Record<string, string> = {
                  artist: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                  character: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                  copyright: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                  general: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
                  meta: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                };

                return (
                  <div key={cat} className="space-y-1">
                    <span className="text-[10px] text-slate-400 capitalize font-medium">{cat}</span>
                    <div className="flex flex-wrap gap-1">
                      {list.map((tag) => (
                        <button
                          key={tag.names[0]}
                          onClick={() => handleTagClick(tag.names[0])}
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors hover:brightness-125 ${catColors[cat]}`}
                        >
                          {tag.names[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Metadata Info Card */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-2 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Uploader</span>
                </span>
                <span className="font-medium text-white">{post.user?.name || 'anonymous'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date</span>
                </span>
                <span>{new Date(post.creationTime).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Dimensions</span>
                </span>
                <span>
                  {post.canvasWidth} × {post.canvasHeight}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>File Size</span>
                </span>
                <span>{formatFileSize(post.fileSize)}</span>
              </div>

              {post.source && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Source</span>
                  <a
                    href={post.source}
                    target="_blank"
                    rel="noreferrer"
                    className="text-pink-400 hover:underline flex items-center space-x-1 max-w-[150px] truncate"
                  >
                    <span className="truncate">{post.source}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* Comments List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <MessageSquare className="w-3 h-3 text-pink-400" />
                <span>Comments ({comments.length})</span>
              </div>

              <div className="space-y-2.5">
                {comments.map((c) => (
                  <div key={c.id} className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-200">{c.user?.name || 'User'}</span>
                      <span className="text-slate-500">
                        {new Date(c.creationTime).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-xs">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Comment Form */}
          <form
            onSubmit={handleAddComment}
            className="p-3 border-t border-slate-800 bg-slate-950 flex items-center space-x-2"
          >
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add comment..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || isSubmittingComment}
              className="p-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white disabled:opacity-50 transition"
              aria-label="Send comment"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
