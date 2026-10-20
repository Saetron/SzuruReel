import React, { useState, useEffect } from 'react';
import { SzuruTag } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import { Tag as TagIcon, Search, Sparkles, Loader2, ArrowRight } from 'lucide-react';

export const TagExplorer: React.FC = () => {
  const { api, setSearchQuery, setActiveMode, showToast } = useSzuru();

  const [tags, setTags] = useState<SzuruTag[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      try {
        const results = await api.searchTags(query, 50);
        setTags(results);
      } catch (err: any) {
        showToast(`Failed to load tags: ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchTags, 300);
    return () => clearTimeout(timer);
  }, [api, query, showToast]);

  const filteredTags = tags.filter((t) => {
    if (activeCategory === 'all') return true;
    return t.category.toLowerCase() === activeCategory.toLowerCase();
  });

  const handleSelectTag = (tagName: string) => {
    setSearchQuery(tagName);
    setActiveMode('gallery');
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'artist':
        return 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20';
      case 'character':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20';
      case 'copyright':
        return 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20';
      case 'meta':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20';
      default:
        return 'text-sky-400 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2">
            <TagIcon className="w-6 h-6 text-pink-500" />
            <span>Tag Explorer</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and discover tags across your Szurubooru archive
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter tag names..."
            className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-3 mb-6">
        {['all', 'general', 'artist', 'character', 'copyright', 'meta'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
              activeCategory === cat
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tag Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">No tags found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredTags.map((tag) => {
            const name = tag.names[0];
            return (
              <button
                key={name}
                onClick={() => handleSelectTag(name)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 group ${getCategoryColor(
                  tag.category
                )}`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-xs truncate max-w-[140px]">#{name}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                </div>
                <div className="flex items-center justify-between mt-3 text-[10px] opacity-80">
                  <span className="capitalize">{tag.category}</span>
                  <span className="font-semibold bg-black/20 px-1.5 py-0.5 rounded">
                    {tag.usages} {tag.usages === 1 ? 'post' : 'posts'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
