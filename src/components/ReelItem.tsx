import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SzuruPost } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import {
  Heart,
  Bookmark,
  MessageCircle,
  Volume2,
  VolumeX,
  Share2,
  Info,
  Play,
  ExternalLink,
} from 'lucide-react';
import { ReelComments } from './ReelComments';

interface ReelItemProps {
  post: SzuruPost;
  isActive: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  onOpenDetails: (post: SzuruPost) => void;
}

interface HeartParticle {
  id: number;
  x: number;
  y: number;
}

export const ReelItem: React.FC<ReelItemProps> = ({
  post,
  isActive,
  isMuted,
  toggleMute,
  onOpenDetails,
}) => {
  const { api, showToast, setSearchQuery, setActiveMode } = useSzuru();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isLiked, setIsLiked] = useState(post.ownScore === 1);
  const [scoreCount, setScoreCount] = useState(post.score);
  const [isFavorited, setIsFavorited] = useState(!!post.ownFavorite);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [progress, setProgress] = useState(0);
  const [heartParticles, setHeartParticles] = useState<HeartParticle[]>([]);

  // Double tap tracking
  const lastTapRef = useRef<number>(0);

  const mediaUrl = api.resolveMediaUrl(post.contentUrl);
  const isVideo = post.type === 'video' || post.mimeType?.startsWith('video/') || post.contentUrl.endsWith('.mp4') || post.contentUrl.endsWith('.webm');

  // Handle active video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    if (isActive) {
      video.muted = isMuted;
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay with sound might have been blocked, try muted
            video.muted = true;
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
      setProgress(0);
    }
  }, [isActive, isVideo]);

  // Sync mute state change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Update progress bar
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(pct);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current || !isVideo) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      setShowPlayIcon(false);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowPlayIcon(true);
    }
  };

  // Like action
  const handleLike = useCallback(async () => {
    const newScore = isLiked ? 0 : 1;
    setIsLiked(!isLiked);
    setScoreCount((prev) => (isLiked ? prev - 1 : prev + 1));
    try {
      await api.setScore(post.id, newScore);
    } catch {
      // Revert if error
      setIsLiked(isLiked);
      setScoreCount((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  }, [api, isLiked, post.id]);

  // Favorite action
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

  // Double tap handler
  const handleMediaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap triggered
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const particleId = Date.now() + Math.random();
      setHeartParticles((prev) => [...prev, { id: particleId, x, y }]);
      setTimeout(() => {
        setHeartParticles((prev) => prev.filter((p) => p.id !== particleId));
      }, 900);

      if (!isLiked) {
        handleLike();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap on video: play/pause
      if (isVideo) {
        togglePlayPause();
      }
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Post link copied to clipboard!', 'info');
    }
  };

  const handleTagClick = (tagName: string) => {
    setSearchQuery(tagName);
    setActiveMode('gallery');
  };

  // Category color mapper
  const getTagColorClass = (category: string) => {
    switch (category.toLowerCase()) {
      case 'artist':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30';
      case 'character':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30';
      case 'copyright':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30';
      case 'meta':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30';
      case 'technical':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30';
      case 'species':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30';
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30 hover:bg-sky-500/30';
    }
  };

  const visibleTags = showAllTags ? post.tags : post.tags.slice(0, 5);

  return (
    <div className="relative w-full h-full snap-start snap-always shrink-0 flex items-center justify-center bg-black overflow-hidden select-none">
      {/* Blurred background backdrop for ambient lighting */}
      <div
        className="absolute inset-0 opacity-20 filter blur-3xl scale-125 bg-cover bg-center pointer-events-none transition-all duration-700"
        style={{ backgroundImage: `url(${api.resolveMediaUrl(post.thumbnailUrl || post.contentUrl)})` }}
      />

      {/* Main media container */}
      <div
        className="relative w-full h-full max-w-lg mx-auto flex items-center justify-center cursor-pointer"
        onClick={handleMediaClick}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-contain pointer-events-none"
            loop
            playsInline
            onTimeUpdate={handleTimeUpdate}
          />
        ) : (
          <img
            src={mediaUrl}
            alt={`Post #${post.id}`}
            className="w-full h-full object-contain pointer-events-none"
            loading="lazy"
          />
        )}

        {/* Center paused overlay icon */}
        {isVideo && showPlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
            <div className="p-4 rounded-full bg-black/60 text-white backdrop-blur-md animate-fade-in">
              <Play className="w-10 h-10 fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Double-tap floating heart particles */}
        {heartParticles.map((p) => (
          <div
            key={p.id}
            style={{ left: `${p.x}px`, top: `${p.y}px` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-ping-once text-pink-500 z-30"
          >
            <Heart className="w-20 h-20 fill-pink-500 drop-shadow-2xl" />
          </div>
        ))}
      </div>

      {/* Right Action Rail (TikTok Style) */}
      <div className="absolute right-3 bottom-24 sm:bottom-16 z-20 flex flex-col items-center space-y-4">
        {/* User avatar */}
        <div className="relative group cursor-pointer" onClick={() => onOpenDetails(post)}>
          <div className="w-12 h-12 rounded-full border-2 border-pink-500 overflow-hidden bg-slate-800 shadow-lg flex items-center justify-center text-white font-bold text-sm">
            {post.user?.avatarUrl ? (
              <img src={api.resolveMediaUrl(post.user.avatarUrl)} alt={post.user.name} className="w-full h-full object-cover" />
            ) : (
              post.user?.name?.slice(0, 1).toUpperCase() || 'S'
            )}
          </div>
        </div>

        {/* Like Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleLike}
            className={`p-3 rounded-full backdrop-blur-md transition-transform duration-200 active:scale-75 shadow-lg ${
              isLiked ? 'bg-pink-500/90 text-white' : 'bg-black/40 text-white hover:bg-black/60'
            }`}
            aria-label="Like post"
          >
            <Heart className={`w-6 h-6 transition-colors ${isLiked ? 'fill-white stroke-white' : 'stroke-white'}`} />
          </button>
          <span className="text-xs font-semibold text-white mt-1 drop-shadow-md">{scoreCount}</span>
        </div>

        {/* Favorite Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleFavorite}
            className={`p-3 rounded-full backdrop-blur-md transition-transform duration-200 active:scale-75 shadow-lg ${
              isFavorited ? 'bg-amber-500/90 text-white' : 'bg-black/40 text-white hover:bg-black/60'
            }`}
            aria-label="Favorite post"
          >
            <Bookmark className={`w-6 h-6 ${isFavorited ? 'fill-white stroke-white' : 'stroke-white'}`} />
          </button>
          <span className="text-xs font-semibold text-white mt-1 drop-shadow-md">Save</span>
        </div>

        {/* Comments Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setIsCommentsOpen(true)}
            className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-transform duration-200 active:scale-75 shadow-lg"
            aria-label="Open comments"
          >
            <MessageCircle className="w-6 h-6 stroke-white" />
          </button>
          <span className="text-xs font-semibold text-white mt-1 drop-shadow-md">
            {post.comments?.length || 0}
          </span>
        </div>

        {/* Sound toggle (for video) */}
        {isVideo && (
          <div className="flex flex-col items-center">
            <button
              onClick={toggleMute}
              className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-transform duration-200 active:scale-75 shadow-lg"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-6 h-6 stroke-white" /> : <Volume2 className="w-6 h-6 stroke-white" />}
            </button>
            <span className="text-xs font-semibold text-white mt-1 drop-shadow-md">
              {isMuted ? 'Mute' : 'Audio'}
            </span>
          </div>
        )}

        {/* Share Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleShare}
            className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-transform duration-200 active:scale-75 shadow-lg"
            aria-label="Share post"
          >
            <Share2 className="w-6 h-6 stroke-white" />
          </button>
          <span className="text-xs font-semibold text-white mt-1 drop-shadow-md">Share</span>
        </div>

        {/* Full Details Modal Trigger */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => onOpenDetails(post)}
            className="p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-transform duration-200 active:scale-75 shadow-lg"
            aria-label="View post details"
          >
            <Info className="w-6 h-6 stroke-white" />
          </button>
          <span className="text-xs font-semibold text-white mt-1 drop-shadow-md">Info</span>
        </div>
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute left-0 bottom-4 sm:bottom-6 right-16 sm:right-20 z-20 px-4 max-w-lg pointer-events-none">
        <div className="pointer-events-auto space-y-2">
          {/* Uploader and Safety */}
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-white drop-shadow-md hover:underline cursor-pointer">
              @{post.user?.name || 'anonymous'}
            </span>
            {post.safety && (
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shadow-sm ${
                  post.safety === 'safe'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : post.safety === 'sketchy'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {post.safety}
              </span>
            )}
            {post.type && (
              <span className="text-[10px] uppercase font-semibold text-slate-300 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full">
                {post.type}
              </span>
            )}
          </div>

          {/* Source Link */}
          {post.source && (
            <a
              href={post.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-xs text-slate-300 hover:text-white transition-colors drop-shadow"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[200px]">
                {post.source.replace(/^https?:\/\/(www\.)?/, '')}
              </span>
            </a>
          )}

          {/* Tags Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto no-scrollbar">
            {visibleTags.map((tag, idx) => {
              const primaryName = tag.names[0];
              return (
                <button
                  key={`${primaryName}-${idx}`}
                  onClick={() => handleTagClick(primaryName)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md border backdrop-blur-md transition-colors ${getTagColorClass(
                    tag.category
                  )}`}
                >
                  #{primaryName}
                </button>
              );
            })}
            {post.tags.length > 5 && (
              <button
                onClick={() => setShowAllTags(!showAllTags)}
                className="text-[11px] text-slate-300 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors"
              >
                {showAllTags ? 'less' : `+${post.tags.length - 5} more`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video Progress Bar */}
      {isVideo && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div
            className="h-full bg-pink-500 transition-all duration-100 ease-linear shadow-[0_0_8px_#ec4899]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Comments Drawer */}
      <ReelComments
        post={post}
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        onCommentAdded={(c) => {
          if (!post.comments) post.comments = [];
          post.comments.push(c);
        }}
      />
    </div>
  );
};
