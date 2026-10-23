import React, { useState, useRef } from 'react';
import { useSzuru } from '../context/SzuruContext';
import { PostSafety, SzuruPost, SzuruTag } from '../types/szuru';
import {
  X,
  UploadCloud,
  FileVideo,
  FileImage,
  Tag as TagIcon,
  Link,
  GitBranch,
  Shield,
  Loader2,
  Check,
  Globe,
  AlertTriangle,
  ExternalLink,
  UserCheck,
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
  onOpenExistingPost?: (postId: number) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  onOpenExistingPost,
}) => {
  const { api, showToast } = useSzuru();

  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [contentUrlInput, setContentUrlInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [safety, setSafety] = useState<PostSafety>('safe');
  const [source, setSource] = useState('');
  const [relationsInput, setRelationsInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Duplicate / similar posts check
  const [similarPosts, setSimilarPosts] = useState<{ exact: boolean; distance: number; post: SzuruPost }[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<SzuruTag[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    // Run duplicate check if image
    if (selectedFile.type.startsWith('image/')) {
      setIsCheckingDuplicates(true);
      try {
        const found = await api.findSimilarPosts(selectedFile);
        setSimilarPosts(found);
      } catch {
        setSimilarPosts([]);
      } finally {
        setIsCheckingDuplicates(false);
      }
    } else {
      setSimilarPosts([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleTagInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTagInput(val);

    if (val.trim().length >= 2) {
      try {
        const found = await api.searchTags(val.trim(), 5);
        setSuggestions(found);
      } catch {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const addTag = (tagName: string) => {
    const clean = tagName.trim().toLowerCase().replace(/\s+/g, '_');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
    setSuggestions([]);
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadMode === 'file' && !file) {
      showToast('Please select a file to upload', 'error');
      return;
    }
    if (uploadMode === 'url' && !contentUrlInput.trim()) {
      showToast('Please provide a media URL to upload from', 'error');
      return;
    }
    if (tags.length === 0) {
      showToast('Please provide at least one tag', 'error');
      return;
    }

    const relations = relationsInput
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    setIsUploading(true);
    try {
      await api.uploadPost({
        file: uploadMode === 'file' && file ? file : undefined,
        contentUrl: uploadMode === 'url' ? contentUrlInput.trim() : undefined,
        tags,
        safety,
        source: source.trim() || undefined,
        relations: relations.length > 0 ? relations : undefined,
        anonymous: isAnonymous || undefined,
      });

      showToast('Post uploaded successfully!', 'success');
      onClose();
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const isVideo = file?.type.startsWith('video/') || contentUrlInput.endsWith('.mp4') || contentUrlInput.endsWith('.webm');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-pink-500" />
            <h2 className="font-bold text-base text-white">Upload to Szurubooru</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Mode Switcher */}
        <div className="flex items-center px-5 pt-3 border-b border-slate-800/80 bg-slate-900/50 space-x-3 text-xs">
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={`pb-2.5 font-bold border-b-2 flex items-center space-x-1.5 transition ${
              uploadMode === 'file'
                ? 'border-pink-500 text-pink-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileImage className="w-4 h-4" />
            <span>Local File</span>
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('url')}
            className={`pb-2.5 font-bold border-b-2 flex items-center space-x-1.5 transition ${
              uploadMode === 'url'
                ? 'border-pink-500 text-pink-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Upload from URL</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* File Picker or URL Input */}
          {uploadMode === 'file' ? (
            !previewUrl ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-pink-500 rounded-2xl p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-pink-500/5 group"
              >
                <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-pink-400 transition-colors mb-2" />
                <p className="font-semibold text-slate-200 text-sm">
                  Click to browse or drag and drop media
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Supports MP4, WebM, PNG, JPG, GIF, WebP
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center max-h-52 group">
                {isVideo ? (
                  <video src={previewUrl} controls className="max-h-52 max-w-full object-contain" />
                ) : (
                  <img src={previewUrl} alt="Upload preview" className="max-h-52 max-w-full object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    setSimilarPosts([]);
                  }}
                  className="absolute top-2.5 right-2.5 p-1 rounded-full bg-black/70 hover:bg-black text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          ) : (
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-pink-400" />
                <span>Media Remote URL</span>
              </label>
              <input
                type="url"
                value={contentUrlInput}
                onChange={(e) => setContentUrlInput(e.target.value)}
                placeholder="https://example.com/art/image.png"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
              />
              <p className="text-[10px] text-slate-500">
                Szurubooru will download and process this media directly from the remote server.
              </p>
            </div>
          )}

          {/* Duplicate / Similar Image Warning */}
          {similarPosts.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 animate-fade-in">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Possible Duplicate Detected!</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Found similar post(s) already uploaded to your booru:
              </p>
              <div className="flex items-center space-x-2 overflow-x-auto py-1">
                {similarPosts.slice(0, 3).map(({ post: p, exact }) => (
                  <div
                    key={p.id}
                    onClick={() => onOpenExistingPost && onOpenExistingPost(p.id)}
                    className="flex items-center space-x-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-400 cursor-pointer shrink-0 transition"
                  >
                    <img
                      src={api.resolveMediaUrl(p.thumbnailUrl || p.contentUrl)}
                      alt={`Post #${p.id}`}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div>
                      <span className="font-bold text-slate-200">#{p.id}</span>
                      <span className="block text-[9px] text-amber-400 font-bold">
                        {exact ? 'Exact Match' : 'Similar'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags Input */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center space-x-1.5">
              <TagIcon className="w-3.5 h-3.5 text-pink-400" />
              <span>Tags (Space or Enter to add)</span>
            </label>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 focus-within:border-pink-500 flex flex-wrap gap-1.5 min-h-[42px]">
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className="bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center space-x-1"
                >
                  <span>#{t}</span>
                  <button type="button" onClick={() => removeTag(idx)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleKeyDownTag}
                placeholder={tags.length === 0 ? 'e.g. animated, neon, cyberpunk' : ''}
                className="bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none flex-1 min-w-[120px] text-xs px-1"
              />
            </div>

            {/* Tag autocomplete drop */}
            {suggestions.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl mt-1 divide-y divide-slate-700/60">
                {suggestions.map((s) => (
                  <button
                    key={s.names[0]}
                    type="button"
                    onClick={() => addTag(s.names[0])}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center justify-between transition-colors"
                  >
                    <span className="font-semibold text-slate-200">#{s.names[0]}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{s.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Safety Rating */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-pink-400" />
              <span>Safety Rating</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['safe', 'sketchy', 'unsafe'] as PostSafety[]).map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setSafety(rating)}
                  className={`py-2 rounded-xl text-center font-bold uppercase tracking-wider text-[11px] border transition ${
                    safety === rating
                      ? rating === 'safe'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : rating === 'sketchy'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          {/* Source & Relations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center space-x-1.5">
                <Link className="w-3.5 h-3.5 text-pink-400" />
                <span>Source URL</span>
              </label>
              <input
                type="url"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center space-x-1.5">
                <GitBranch className="w-3.5 h-3.5 text-pink-400" />
                <span>Relations (Post IDs)</span>
              </label>
              <input
                type="text"
                value={relationsInput}
                onChange={(e) => setRelationsInput(e.target.value)}
                placeholder="e.g. 12, 15"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
              />
            </div>
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center space-x-2 pt-1">
            <label className="flex items-center space-x-2 text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-pink-500 focus:ring-0"
              />
              <span className="text-xs">Upload anonymously (hide your username on post)</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isUploading || (uploadMode === 'file' ? !file : !contentUrlInput.trim())}
              className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-pink-500/30 transition-transform active:scale-98 flex items-center justify-center space-x-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to Szurubooru...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit Post</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
