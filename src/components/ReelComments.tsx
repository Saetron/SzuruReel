import React, { useState } from 'react';
import { SzuruComment, SzuruPost } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import { X, Send, MessageSquare } from 'lucide-react';

interface ReelCommentsProps {
  post: SzuruPost;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: (newComment: SzuruComment) => void;
}

export const ReelComments: React.FC<ReelCommentsProps> = ({
  post,
  isOpen,
  onClose,
  onCommentAdded,
}) => {
  const { api, showToast } = useSzuru();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentsList, setCommentsList] = useState<SzuruComment[]>(post.comments || []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newComment = await api.createComment(post.id, commentText.trim());
      setCommentsList((prev) => [...prev, newComment]);
      setCommentText('');
      showToast('Comment posted!', 'success');
      if (onCommentAdded) {
        onCommentAdded(newComment);
      }
    } catch (err: any) {
      showToast(`Failed to post comment: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full sm:max-w-md h-[70vh] sm:h-[85vh] bg-slate-900/95 border-t sm:border border-slate-700/60 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-pink-400" />
            <h3 className="font-semibold text-sm">
              Comments <span className="text-slate-400 font-normal">({commentsList.length})</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close comments"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {commentsList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
              <MessageSquare className="w-10 h-10 mb-2 stroke-[1.5] text-slate-600" />
              <p className="text-sm font-medium">No comments yet</p>
              <p className="text-xs text-slate-500 mt-1">Be the first to share your thoughts!</p>
            </div>
          ) : (
            commentsList.map((c) => (
              <div key={c.id} className="flex items-start space-x-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden shadow">
                  {c.user?.avatarUrl ? (
                    <img src={c.user.avatarUrl} alt={c.user.name} className="w-full h-full object-cover" />
                  ) : (
                    c.user?.name?.slice(0, 1).toUpperCase() || 'U'
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline space-x-2">
                    <span className="font-semibold text-xs text-slate-200">{c.user?.name || 'Anonymous'}</span>
                    <span className="text-[10px] text-slate-500">{formatRelativeTime(c.creationTime)}</span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center space-x-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || isSubmitting}
            className="p-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white disabled:opacity-40 disabled:hover:bg-pink-500 transition-colors shrink-0 shadow-lg shadow-pink-500/20"
            aria-label="Send comment"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
