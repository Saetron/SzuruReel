import React, { useState, useRef } from 'react';
import { useSzuru } from '../context/SzuruContext';
import { PostSafety, SzuruTag } from '../types/szuru';
import {
  X,
  UploadCloud,
  FileVideo,
  FileImage,
  Tag as TagIcon,
  Link,
  Shield,
  Loader2,
  Check,
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const { api, showToast } = useSzuru();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [safety, setSafety] = useState<PostSafety>('safe');
  const [source, setSource] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<SzuruTag[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
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
    if (!file) {
      showToast('Please select a file to upload', 'error');
      return;
    }
    if (tags.length === 0) {
      showToast('Please provide at least one tag', 'error');
      return;
    }

    setIsUploading(true);
    try {
      await api.uploadPost({
        file,
        tags,
        safety,
        source: source.trim() || undefined,
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

  const isVideo = file?.type.startsWith('video/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-pink-500" />
            <h2 className="font-bold text-base text-white">Upload to Booru</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* File Dropzone */}
          {!previewUrl ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-pink-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-pink-500/5 group"
            >
              <UploadCloud className="w-12 h-12 text-slate-500 group-hover:text-pink-400 transition-colors mb-3" />
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
            <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center max-h-60 group">
              {isVideo ? (
                <video src={previewUrl} controls className="max-h-60 max-w-full object-contain" />
              ) : (
                <img src={previewUrl} alt="Upload preview" className="max-h-60 max-w-full object-contain" />
              )}
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] text-slate-300 flex items-center space-x-1.5">
                {isVideo ? <FileVideo className="w-3.5 h-3.5 text-pink-400" /> : <FileImage className="w-3.5 h-3.5 text-sky-400" />}
                <span className="truncate max-w-[200px]">{file?.name}</span>
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
                  <button
                    type="button"
                    onClick={() => removeTag(idx)}
                    className="hover:text-white"
                  >
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

          {/* Source Input */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center space-x-1.5">
              <Link className="w-3.5 h-3.5 text-pink-400" />
              <span>Source URL (Optional)</span>
            </label>
            <input
              type="url"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="https://artstation.com/artwork/..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isUploading || !file}
              className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-pink-500/30 transition-transform active:scale-98 flex items-center justify-center space-x-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to Szurubooru...</span>
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
