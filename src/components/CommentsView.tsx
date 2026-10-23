import React, { useState, useEffect, useCallback } from 'react';
import { SzuruComment } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import { MessageSquare, Heart, ThumbsUp, ThumbsDown, Search, Loader2, ArrowUp, Sparkles, ExternalLink } from 'lucide-react';

interface CommentsViewProps {
  onOpenPost: (postId: number) => void;
  onOpenUser: (username: string) => void;
}

export const CommentsView: React.FC<CommentsViewProps> = ({ onOpenPost, onOpenUser }) => {
  const { api, showToast } = useSzuru();

  const [comments, setComments] = useState<SzuruComment[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const fetchComments = useCallback(
    async (offset = 0, reset = false) => {
      setIsLoading(true);
      try {
        const res = await api.getComments({
          query: search.trim(),
          offset,
          limit: 25,
        });

        if (reset) {
          setComments(res.results);
        } else {
          setComments((prev) => [...prev, ...res.results]);
        }
        setTotal(res.total);
        setHasMore(offset + res.results.length < res.total);
      } catch (err: any) {
        showToast(`Failed to load comments: ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [api, search, showToast]
  );

  useEffect(() => {
    fetchComments(0, true);
  }, [fetchComments]);

  const handleVote = async (commentId: number, currentScore: number, ownScore: number | undefined, delta: number) => {
    const newScore = ownScore === delta ? 0 : delta;
    try {
      const updated = await api.setCommentScore(commentId, newScore);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, score: updated, ownScore: newScore } : c))
      );
    } catch (err: any) {
      showToast(`Vote failed: ${err.message}`, 'error');
    }
  };

  const formatRelativeTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return 'just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2">
            <MessageSquare className="w-6 h-6 text-pink-500" />
            <span>Recent Comments</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Global community discussion across all booru posts ({total} comments)
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchComments(0, true);
            }}
            placeholder="Search comment text or author..."
            className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {/* Comments List */}
      {comments.length === 0 && !isLoading ? (
        <div className="text-center py-20 text-slate-500">
          <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">No comments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const postId = comment.postId || (comment.post && typeof comment.post === 'object' ? comment.post.id : null);
            const thumbUrl = comment.post && typeof comment.post === 'object'
              ? api.resolveMediaUrl(comment.post.thumbnailUrl || comment.post.contentUrl)
              : null;

            return (
              <div
                key={comment.id}
                className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 shadow-lg transition flex flex-col sm:flex-row gap-4 items-start"
              >
                {/* Associated Post Thumbnail (if available) */}
                {postId && (
                  <div
                    onClick={() => onOpenPost(postId)}
                    className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 cursor-pointer border border-slate-800 group hover:border-pink-500/50 transition"
                  >
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={`Post #${postId}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-bold">
                        #{postId}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Comment Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div
                        onClick={() => onOpenUser(comment.user.name)}
                        className="w-7 h-7 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-pink-500 transition"
                      >
                        {comment.user.avatarUrl ? (
                          <img src={comment.user.avatarUrl} alt={comment.user.name} className="w-full h-full object-cover" />
                        ) : (
                          comment.user.name?.slice(0, 1).toUpperCase() || 'U'
                        )}
                      </div>
                      <span
                        onClick={() => onOpenUser(comment.user.name)}
                        className="font-bold text-xs text-slate-200 hover:text-pink-400 cursor-pointer transition"
                      >
                        {comment.user.name}
                      </span>
                      {comment.user.rank && comment.user.rank !== 'regular' && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">
                          {comment.user.rank}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      <span>{formatRelativeTime(comment.creationTime)}</span>
                      {postId && (
                        <button
                          onClick={() => onOpenPost(postId)}
                          className="text-pink-400 hover:underline font-mono text-[11px]"
                        >
                          on #{postId}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{comment.text}</p>

                  {/* Comment Vote & Footer */}
                  <div className="flex items-center space-x-3 mt-3 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center space-x-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                      <button
                        onClick={() => handleVote(comment.id, comment.score, comment.ownScore, 1)}
                        className={`p-1 rounded hover:text-emerald-400 transition ${
                          comment.ownScore === 1 ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                        title="Upvote comment"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-slate-300 min-w-[16px] text-center">
                        {comment.score}
                      </span>
                      <button
                        onClick={() => handleVote(comment.id, comment.score, comment.ownScore, -1)}
                        className={`p-1 rounded hover:text-rose-400 transition ${
                          comment.ownScore === -1 ? 'text-rose-400' : 'text-slate-500'
                        }`}
                        title="Downvote comment"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination / Load more */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fetchComments(comments.length)}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center space-x-2 shadow-lg disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                <span>Loading comments...</span>
              </>
            ) : (
              <span>Load More Comments</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
