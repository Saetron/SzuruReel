import React, { useState, useRef, useEffect } from 'react';
import { SzuruComment, SzuruNote, SzuruPost } from '../types/szuru';
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
  Edit3,
  Trash2,
  GitMerge,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  PlusSquare,
  ThumbsUp,
  ThumbsDown,
  Check,
  Shield,
  Link as LinkIcon,
  Share2,
} from 'lucide-react';

interface PostDetailModalProps {
  post: SzuruPost;
  onClose: () => void;
  onOpenInReel: (postId: number) => void;
  onPostUpdated?: (updated: SzuruPost) => void;
  onPostDeleted?: (postId: number) => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  currentIndex?: number;
  totalPosts?: number;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post: initialPost,
  onClose,
  onOpenInReel,
  onPostUpdated,
  onPostDeleted,
  onNavigateNext,
  onNavigatePrev,
  hasNext = false,
  hasPrev = false,
  currentIndex,
  totalPosts,
}) => {
  const { api, showToast, setSearchQuery, setActiveMode, setSelectedPoolId, setSelectedUserName } = useSzuru();

  const [post, setPost] = useState<SzuruPost>(initialPost);
  const [isLiked, setIsLiked] = useState<boolean>(initialPost.ownScore === 1);
  const [score, setScore] = useState<number>(initialPost.score);
  const [isFavorited, setIsFavorited] = useState<boolean>(!!initialPost.ownFavorite);

  // Comments state
  const [comments, setComments] = useState<SzuruComment[]>(initialPost.comments || []);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<SzuruNote[]>(initialPost.notes || []);
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [noteDraftText, setNoteDraftText] = useState<string>('');
  const [draftPolygon, setDraftPolygon] = useState<[number, number][] | null>(null);
  const [isDrawingNote, setIsDrawingNote] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  // Edit Post state
  const [isEditingPost, setIsEditingPost] = useState<boolean>(false);
  const [editTagsInput, setEditTagsInput] = useState<string>(
    initialPost.tags.map((t) => t.names[0]).join(' ')
  );
  const [editSafety, setEditSafety] = useState(initialPost.safety);
  const [editSource, setEditSource] = useState(initialPost.source || '');
  const [isSavingPost, setIsSavingPost] = useState(false);

  // Merge modal state
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  const isVideo =
    post.type === 'video' ||
    post.mimeType?.startsWith('video/') ||
    post.contentUrl.endsWith('.mp4') ||
    post.contentUrl.endsWith('.webm');

  const mediaUrl = api.resolveMediaUrl(post.contentUrl);

  // Reload full post details (with relations, notes, pools) on mount or when post changes
  useEffect(() => {
    setPost(initialPost);
    setNotes(initialPost.notes || []);
    setComments(initialPost.comments || []);
    setIsLiked(initialPost.ownScore === 1);
    setScore(initialPost.score);
    setIsFavorited(!!initialPost.ownFavorite);

    let isCurrent = true;
    api.getPost(initialPost.id).then((fullPost) => {
      if (isCurrent) {
        setPost(fullPost);
        setNotes(fullPost.notes || []);
        setComments(fullPost.comments || []);
        setIsLiked(fullPost.ownScore === 1);
        setScore(fullPost.score);
        setIsFavorited(!!fullPost.ownFavorite);
      }
    }).catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [api, initialPost]);

  // Keyboard navigation (ArrowLeft / ArrowRight to switch posts, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'j' || e.key === 'J') {
        if (hasNext && onNavigateNext) {
          e.preventDefault();
          onNavigateNext();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'k' || e.key === 'K') {
        if (hasPrev && onNavigatePrev) {
          e.preventDefault();
          onNavigatePrev();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrev, onNavigateNext, onNavigatePrev, onClose]);

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

  const handleVoteComment = async (commentId: number, currentScore: number, ownScore: number | undefined, delta: number) => {
    const newScore = ownScore === delta ? 0 : delta;
    try {
      const updated = await api.setCommentScore(commentId, newScore);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, score: updated, ownScore: newScore } : c))
      );
    } catch (err: any) {
      showToast(`Comment vote failed: ${err.message}`, 'error');
    }
  };

  // ==================== IMAGE NOTES ====================

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (!isAddingNote || !imageElementRef.current) return;
    const rect = imageElementRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setIsDrawingNote(true);
    setDrawStart({ x, y });
    setDraftPolygon([
      [x, y],
      [x, y],
      [x, y],
      [x, y],
    ]);
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingNote || !drawStart || !imageElementRef.current) return;
    const rect = imageElementRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const x1 = Math.min(drawStart.x, currentX);
    const y1 = Math.min(drawStart.y, currentY);
    const x2 = Math.max(drawStart.x, currentX);
    const y2 = Math.max(drawStart.y, currentY);

    setDraftPolygon([
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
    ]);
  };

  const handleImageMouseUp = () => {
    if (isDrawingNote) {
      setIsDrawingNote(false);
    }
  };

  const handleSaveNewNote = async () => {
    if (!draftPolygon || !noteDraftText.trim()) {
      showToast('Please draw an area and enter text for the note', 'error');
      return;
    }

    // Convert normalized polygon to canvas coordinates (0 to canvasWidth, 0 to canvasHeight)
    const cw = post.canvasWidth || 1000;
    const ch = post.canvasHeight || 1000;
    const canvasPolygon: [number, number][] = draftPolygon.map(([x, y]) => [
      Math.round(x * cw),
      Math.round(y * ch),
    ]);

    const newNoteList: SzuruNote[] = [...notes, { polygon: canvasPolygon, text: noteDraftText.trim() }];

    try {
      const updated = await api.updatePost(post.id, post.version, { notes: newNoteList });
      setPost(updated);
      setNotes(updated.notes || []);
      setIsAddingNote(false);
      setDraftPolygon(null);
      setNoteDraftText('');
      showToast('Note added!', 'success');
      if (onPostUpdated) onPostUpdated(updated);
    } catch (err: any) {
      showToast(`Failed to add note: ${err.message}`, 'error');
    }
  };

  const handleDeleteNote = async (index: number) => {
    const updatedNotes = notes.filter((_, idx) => idx !== index);
    try {
      const updated = await api.updatePost(post.id, post.version, { notes: updatedNotes });
      setPost(updated);
      setNotes(updated.notes || []);
      showToast('Note deleted', 'success');
      if (onPostUpdated) onPostUpdated(updated);
    } catch (err: any) {
      showToast(`Failed to delete note: ${err.message}`, 'error');
    }
  };

  // Convert note polygon back to percentage style for rendering
  const getNoteBoxStyle = (polygon: [number, number][]) => {
    const cw = post.canvasWidth || 1000;
    const ch = post.canvasHeight || 1000;

    const xs = polygon.map(([x]) => x / cw);
    const ys = polygon.map(([, y]) => y / ch);

    const minX = Math.min(...xs) * 100;
    const minY = Math.min(...ys) * 100;
    const maxX = Math.max(...xs) * 100;
    const maxY = Math.max(...ys) * 100;

    return {
      left: `${minX}%`,
      top: `${minY}%`,
      width: `${Math.max(2, maxX - minX)}%`,
      height: `${Math.max(2, maxY - minY)}%`,
    };
  };

  // ==================== EDIT & DELETE POST ====================

  const handleSavePostEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPost(true);
    try {
      const tagList = editTagsInput
        .split(/\s+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const updated = await api.updatePost(post.id, post.version, {
        tags: tagList,
        safety: editSafety,
        source: editSource.trim() || undefined,
      });

      setPost(updated);
      setIsEditingPost(false);
      showToast('Post updated successfully!', 'success');
      if (onPostUpdated) onPostUpdated(updated);
    } catch (err: any) {
      showToast(`Update failed: ${err.message}`, 'error');
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm(`Are you sure you want to permanently delete Post #${post.id}?`)) return;
    try {
      await api.deletePost(post.id, post.version);
      showToast(`Post #${post.id} deleted`, 'success');
      onClose();
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleMergePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = parseInt(mergeTargetId.trim(), 10);
    if (isNaN(targetId) || targetId === post.id) {
      showToast('Please enter a valid target post ID to merge into', 'error');
      return;
    }

    setIsMerging(true);
    try {
      await api.mergePosts(post.id, targetId);
      showToast(`Post #${post.id} merged into #${targetId}`, 'success');
      setIsMergeOpen(false);
      onClose();
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err: any) {
      showToast(`Merge failed: ${err.message}`, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const handleTagClick = (tagName: string) => {
    setSearchQuery(tagName);
    setActiveMode('gallery');
    onClose();
  };

  const handleSharePost = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Post link copied to clipboard!', 'info');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Group tags by category dynamically so NO tags are dropped
  const categorizedTags = React.useMemo(() => {
    const map: Record<string, typeof post.tags> = {};
    (post.tags || []).forEach((tag) => {
      const cat = (tag.category || 'default').toLowerCase().trim();
      if (!map[cat]) map[cat] = [];
      map[cat].push(tag);
    });
    return map;
  }, [post.tags]);

  // Order categories: standard booru categories first, then any custom categories alphabetically
  const sortedCategories = React.useMemo(() => {
    const orderPriority: Record<string, number> = {
      artist: 1,
      character: 2,
      copyright: 3,
      general: 4,
      default: 5,
      species: 6,
      meta: 7,
      technical: 8,
    };
    return Object.keys(categorizedTags).sort((a, b) => {
      const pA = orderPriority[a] ?? 99;
      const pB = orderPriority[b] ?? 99;
      if (pA !== pB) return pA - pB;
      return a.localeCompare(b);
    });
  }, [categorizedTags]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-7xl h-full md:h-[92vh] bg-slate-900 border-0 md:border border-slate-800 rounded-none md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Media & Interactive Notes Area */}
        <div className="flex-1 bg-black relative flex items-center justify-center min-h-[300px] md:min-h-0 select-none overflow-hidden">
          {/* Top Controls Overlay */}
          <div className="absolute top-4 left-4 z-30 flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onOpenInReel(post.id);
              }}
              className="bg-pink-500 hover:bg-pink-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-pink-500/30 transition-transform active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Watch in Reel</span>
            </button>

            {!isVideo && (
              <>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-md border transition ${
                    showNotes
                      ? 'bg-slate-900/80 text-white border-slate-700'
                      : 'bg-black/40 text-slate-400 border-white/10'
                  }`}
                  title={showNotes ? 'Hide notes' : 'Show notes'}
                >
                  {showNotes ? <Eye className="w-3.5 h-3.5 text-pink-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Notes ({notes.length})</span>
                </button>

                <button
                  onClick={() => {
                    setIsAddingNote(!isAddingNote);
                    setDraftPolygon(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-md border transition ${
                    isAddingNote
                      ? 'bg-emerald-500 text-white border-emerald-400'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <PlusSquare className="w-3.5 h-3.5" />
                  <span>{isAddingNote ? 'Cancel Note' : 'Add Note'}</span>
                </button>
              </>
            )}

            {currentIndex !== undefined && totalPosts !== undefined && (
              <span className="text-xs font-medium text-slate-300 bg-black/50 px-2.5 py-1 rounded-xl backdrop-blur-md border border-white/10 select-none">
                {currentIndex + 1} / {totalPosts}
              </span>
            )}
          </div>

          {/* Previous Post Button */}
          {hasPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigatePrev?.();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/60 shadow-2xl backdrop-blur-md transition-all active:scale-90 z-30 group"
              title="Previous post (Left Arrow / K)"
              aria-label="Previous post"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:-translate-x-0.5" />
            </button>
          )}

          {/* Next Post Button */}
          {hasNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigateNext?.();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/60 shadow-2xl backdrop-blur-md transition-all active:scale-90 z-30 group"
              title="Next post (Right Arrow / J)"
              aria-label="Next post"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}

          {/* Media Viewport */}
          <div
            ref={imageContainerRef}
            className="relative max-h-full max-w-full flex items-center justify-center"
            onMouseDown={handleImageMouseDown}
            onMouseMove={handleImageMouseMove}
            onMouseUp={handleImageMouseUp}
          >
            {isVideo ? (
              <video
                src={mediaUrl}
                controls
                autoPlay
                loop
                className="max-h-[50vh] md:max-h-[92vh] max-w-full object-contain"
              />
            ) : (
              <div className="relative inline-block max-h-[50vh] md:max-h-[92vh] max-w-full">
                <img
                  ref={imageElementRef}
                  src={mediaUrl}
                  alt={`Post #${post.id}`}
                  className="max-h-[50vh] md:max-h-[92vh] max-w-full object-contain pointer-events-auto cursor-crosshair"
                />

                {/* Render Existing Notes */}
                {showNotes &&
                  notes.map((note, idx) => {
                    const style = getNoteBoxStyle(note.polygon);
                    return (
                      <div
                        key={idx}
                        style={style}
                        className="absolute border-2 border-dashed border-amber-300 bg-amber-400/20 hover:bg-amber-400/40 transition group cursor-help z-20"
                      >
                        {/* Note Tooltip */}
                        <div className="absolute left-0 top-full mt-1 hidden group-hover:flex flex-col bg-slate-900/95 border border-slate-700 text-slate-100 p-2.5 rounded-xl shadow-2xl z-40 max-w-xs text-xs whitespace-pre-wrap animate-fade-in backdrop-blur-md">
                          <p className="leading-relaxed">{note.text}</p>
                          <div className="flex justify-end pt-2 mt-2 border-t border-slate-800">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNote(idx);
                              }}
                              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* Draft Note Box being drawn */}
                {draftPolygon && (
                  <div
                    style={{
                      left: `${Math.min(draftPolygon[0][0], draftPolygon[2][0]) * 100}%`,
                      top: `${Math.min(draftPolygon[0][1], draftPolygon[2][1]) * 100}%`,
                      width: `${Math.abs(draftPolygon[2][0] - draftPolygon[0][0]) * 100}%`,
                      height: `${Math.abs(draftPolygon[2][1] - draftPolygon[0][1]) * 100}%`,
                    }}
                    className="absolute border-2 border-emerald-400 bg-emerald-500/30 z-30 pointer-events-none"
                  />
                )}
              </div>
            )}
          </div>

          {/* Add Note Input Bar */}
          {isAddingNote && draftPolygon && (
            <div className="absolute bottom-4 left-4 right-4 z-40 bg-slate-900/95 border border-slate-700 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-2 animate-fade-in max-w-xl mx-auto">
              <input
                type="text"
                value={noteDraftText}
                onChange={(e) => setNoteDraftText(e.target.value)}
                placeholder="Type note annotation text..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-pink-500"
                autoFocus
              />
              <button
                onClick={handleSaveNewNote}
                disabled={!noteDraftText.trim()}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs shadow-md transition"
              >
                Save Note
              </button>
            </div>
          )}
        </div>

        {/* Right: Sidebar Details, Edit, Pools, and Comments */}
        <div className="w-full md:w-[420px] flex flex-col bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 text-slate-100 h-[50vh] md:h-full overflow-hidden">
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

            <div className="flex items-center space-x-1">
              <button
                onClick={handleSharePost}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white border border-transparent hover:bg-slate-800 transition"
                title="Copy post link"
                aria-label="Share post link"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditingPost(!isEditingPost)}
                className={`p-1.5 rounded-lg border transition ${
                  isEditingPost
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800'
                }`}
                title="Edit post metadata"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Edit Post Mode Form */}
          {isEditingPost ? (
            <form onSubmit={handleSavePostEdits} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-950/40">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-pink-400 text-xs">Edit Post Details</span>
                <span className="text-[10px] text-slate-500">Version: {post.version}</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tags (Space separated)</label>
                <textarea
                  value={editTagsInput}
                  onChange={(e) => setEditTagsInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-pink-500 h-28 resize-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Safety Rating</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['safe', 'sketchy', 'unsafe'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditSafety(r)}
                      className={`py-1.5 rounded-xl text-center font-bold uppercase tracking-wider text-[10px] border transition ${
                        editSafety === r
                          ? 'bg-pink-500 text-white border-pink-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Source URL</label>
                <input
                  type="url"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingPost}
                  className="flex-1 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-pink-500/25 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPost(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
              </div>

              {/* Danger Zone: Delete / Merge */}
              <div className="pt-4 mt-4 border-t border-slate-800/80 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">Danger Zone</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsMergeOpen(true)}
                    className="flex-1 py-1.5 rounded-xl border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs font-semibold flex items-center justify-center space-x-1 transition"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Merge Post</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeletePost}
                    className="flex-1 py-1.5 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-center space-x-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Normal Details & Comments View */
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

              {/* Pools Membership (if any) */}
              {post.pools && post.pools.length > 0 && (
                <div className="space-y-1.5 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <div className="flex items-center space-x-1.5 text-purple-300 font-bold text-[11px]">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Part of Pools</span>
                  </div>
                  {post.pools.map((pool) => (
                    <div key={pool.id} className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => {
                          setSelectedPoolId(pool.id);
                          setActiveMode('pools');
                          onClose();
                        }}
                        className="font-semibold text-slate-200 hover:text-purple-300 truncate max-w-[200px]"
                      >
                        {pool.names[0]}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Categorized Tags */}
              <div className="space-y-3">
                <div className="flex items-center space-x-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <Tag className="w-3 h-3 text-pink-400" />
                  <span>Tags ({post.tags.length})</span>
                </div>

                {sortedCategories.map((cat) => {
                  const list = categorizedTags[cat] || [];
                  if (list.length === 0) return null;

                  const catColors: Record<string, string> = {
                    artist: 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20',
                    character: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20',
                    copyright: 'text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20',
                    general: 'text-sky-400 bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20',
                    default: 'text-sky-400 bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20',
                    meta: 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
                    technical: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20',
                    species: 'text-orange-400 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20',
                  };
                  const colorClass = catColors[cat] || 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20';
                  const displayCatName = cat === 'default' ? 'General' : cat;

                  return (
                    <div key={cat} className="space-y-1">
                      <span className="text-[10px] text-slate-400 capitalize font-medium">{displayCatName}</span>
                      <div className="flex flex-wrap gap-1">
                        {list.map((tag) => {
                          const primaryName = tag.names[0] || 'unknown';
                          return (
                            <button
                              key={primaryName}
                              onClick={() => handleTagClick(primaryName)}
                              className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors hover:brightness-125 ${colorClass}`}
                            >
                              {primaryName}
                            </button>
                          );
                        })}
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
                  <button
                    onClick={() => {
                      if (post.user?.name) {
                        setSelectedUserName(post.user.name);
                      }
                    }}
                    className="font-medium text-white hover:text-pink-400 cursor-pointer"
                  >
                    {post.user?.name || 'anonymous'}
                  </button>
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

              {/* Comments Section */}
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
                        <div className="flex items-center space-x-2 text-slate-500">
                          <span>{new Date(c.creationTime).toLocaleDateString()}</span>
                          <div className="flex items-center space-x-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            <button
                              onClick={() => handleVoteComment(c.id, c.score, c.ownScore, 1)}
                              className={`hover:text-emerald-400 ${c.ownScore === 1 ? 'text-emerald-400' : ''}`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] font-bold text-slate-300">{c.score}</span>
                            <button
                              onClick={() => handleVoteComment(c.id, c.score, c.ownScore, -1)}
                              className={`hover:text-rose-400 ${c.ownScore === -1 ? 'text-rose-400' : ''}`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-xs">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Comment Form */}
          {!isEditingPost && (
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
          )}
        </div>
      </div>

      {/* Merge Post Modal */}
      {isMergeOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsMergeOpen(false)} />
          <div
            className="relative z-10 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-sm text-white mb-2 flex items-center space-x-1.5">
              <GitMerge className="w-4 h-4 text-purple-400" />
              <span>Merge Post #{post.id}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Merging will transfer tags, comments, score, and favorites to the target post, and delete this post.
            </p>
            <form onSubmit={handleMergePost} className="space-y-3">
              <div>
                <label className="block text-slate-300 text-xs mb-1 font-semibold">Target Post ID</label>
                <input
                  type="number"
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isMerging || !mergeTargetId.trim()}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs"
                >
                  {isMerging ? 'Merging...' : 'Confirm Merge'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMergeOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
