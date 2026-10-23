import React, { useState, useEffect, useCallback } from 'react';
import { SzuruTag, SzuruTagCategory } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import {
  Tag as TagIcon,
  Search,
  Sparkles,
  Loader2,
  ArrowRight,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Palette,
  ArrowUpRight,
} from 'lucide-react';

export const TagExplorer: React.FC = () => {
  const { api, setSearchQuery, setActiveMode, tagCategories, refreshTagCategories, showToast } = useSzuru();

  const [tags, setTags] = useState<SzuruTag[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Edit / Create Tag Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<SzuruTag | null>(null);
  const [tagNameInput, setTagNameInput] = useState('');
  const [tagCategoryInput, setTagCategoryInput] = useState('general');
  const [tagSuggestionsInput, setTagSuggestionsInput] = useState('');
  const [tagImplicationsInput, setTagImplicationsInput] = useState('');
  const [isSavingTag, setIsSavingTag] = useState(false);

  // Manage Categories Modal
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#60a5fa');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await api.getTags({ query: query.trim(), limit: 100 });
      setTags(results.results || []);
    } catch (err: any) {
      showToast(`Failed to load tags: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [api, query, showToast]);

  useEffect(() => {
    const timer = setTimeout(fetchTags, 300);
    return () => clearTimeout(timer);
  }, [fetchTags]);

  const filteredTags = tags.filter((t) => {
    if (activeCategory === 'all') return true;
    return t.category.toLowerCase() === activeCategory.toLowerCase();
  });

  const handleSelectTag = (tagName: string) => {
    setSearchQuery(tagName);
    setActiveMode('gallery');
  };

  const openCreateTag = () => {
    setEditingTag(null);
    setTagNameInput('');
    setTagCategoryInput('general');
    setTagSuggestionsInput('');
    setTagImplicationsInput('');
    setIsEditModalOpen(true);
  };

  const openEditTag = (tag: SzuruTag, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTag(tag);
    setTagNameInput(tag.names.join(' '));
    setTagCategoryInput(tag.category);
    setTagSuggestionsInput(tag.suggestions?.join(' ') || '');
    setTagImplicationsInput(tag.implications?.join(' ') || '');
    setIsEditModalOpen(true);
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = tagNameInput.trim().split(/\s+/).filter(Boolean);
    if (names.length === 0) {
      showToast('Tag must have at least one name', 'error');
      return;
    }

    const suggestions = tagSuggestionsInput.trim().split(/\s+/).filter(Boolean);
    const implications = tagImplicationsInput.trim().split(/\s+/).filter(Boolean);

    setIsSavingTag(true);
    try {
      if (editingTag) {
        await api.updateTag(editingTag.names[0], editingTag.version || 1, {
          names,
          category: tagCategoryInput,
          suggestions,
          implications,
        });
        showToast(`Tag "${names[0]}" updated!`, 'success');
      } else {
        await api.createTag({
          names,
          category: tagCategoryInput,
          suggestions,
          implications,
        });
        showToast(`Tag "${names[0]}" created!`, 'success');
      }
      setIsEditModalOpen(false);
      fetchTags();
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsCreatingCat(true);
    try {
      await api.createTagCategory({
        name: newCatName.trim().toLowerCase(),
        color: newCatColor,
      });
      showToast(`Category "${newCatName}" created!`, 'success');
      setNewCatName('');
      refreshTagCategories();
    } catch (err: any) {
      showToast(`Failed to create category: ${err.message}`, 'error');
    } finally {
      setIsCreatingCat(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const found = tagCategories.find((c) => c.name.toLowerCase() === category.toLowerCase());
    if (found?.color) {
      return {
        color: found.color,
        borderColor: `${found.color}40`,
        backgroundColor: `${found.color}15`,
      };
    }
    return {
      color: '#60a5fa',
      borderColor: '#60a5fa40',
      backgroundColor: '#60a5fa15',
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2">
            <TagIcon className="w-6 h-6 text-pink-500" />
            <span>Tag Explorer & Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse, create, and organize metadata tags across your Szurubooru archive
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tag names..."
              className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-pink-500"
            />
          </div>

          <button
            onClick={() => setIsCategoriesModalOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
            title="Manage Tag Categories"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            onClick={openCreateTag}
            className="px-3.5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-pink-500/20 shrink-0 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Tag</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-3 mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
            activeCategory === 'all'
              ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All Categories
        </button>
        {tagCategories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(cat.name)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition flex items-center space-x-1.5 ${
              activeCategory === cat.name
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
            <span>{cat.name}</span>
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
          <p className="text-xs text-slate-500 mt-1">Click "New Tag" to create a new tag category or tag.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredTags.map((tag) => {
            const name = tag.names[0];
            const catStyle = getCategoryColor(tag.category);

            return (
              <div
                key={name}
                onClick={() => handleSelectTag(name)}
                style={catStyle}
                className="p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 group cursor-pointer hover:brightness-125"
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-xs truncate max-w-[130px]" title={name}>
                    #{name}
                  </span>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => openEditTag(tag, e)}
                      className="p-1 rounded hover:bg-black/20"
                      title="Edit tag"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-[10px] opacity-80">
                  <span className="capitalize">{tag.category}</span>
                  <span className="font-semibold bg-black/20 px-1.5 py-0.5 rounded">
                    {tag.usages} {tag.usages === 1 ? 'post' : 'posts'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Tag Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsEditModalOpen(false)} />
          <div
            className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <h2 className="font-bold text-base text-white flex items-center space-x-2">
                <TagIcon className="w-4 h-4 text-pink-500" />
                <span>{editingTag ? `Edit Tag #${editingTag.names[0]}` : 'Create New Tag'}</span>
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTag} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Names & Aliases (Space separated)</label>
                <input
                  type="text"
                  value={tagNameInput}
                  onChange={(e) => setTagNameInput(e.target.value)}
                  placeholder="e.g. cyberpunk sci-fi_city"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category</label>
                <select
                  value={tagCategoryInput}
                  onChange={(e) => setTagCategoryInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500 capitalize"
                >
                  {tagCategories.map((c) => (
                    <option key={c.name} value={c.name} className="capitalize">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Implications (Tags to auto-add)</label>
                <input
                  type="text"
                  value={tagImplicationsInput}
                  onChange={(e) => setTagImplicationsInput(e.target.value)}
                  placeholder="e.g. animal_ears"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Suggestions (Related tags)</label>
                <input
                  type="text"
                  value={tagSuggestionsInput}
                  onChange={(e) => setTagSuggestionsInput(e.target.value)}
                  placeholder="e.g. neon_lights rain"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingTag}
                  className="w-full py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-pink-500/25 transition"
                >
                  {isSavingTag ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingTag ? 'Save Tag' : 'Create Tag'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Manager Modal */}
      {isCategoriesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsCategoriesModalOpen(false)} />
          <div
            className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <h2 className="font-bold text-base text-white flex items-center space-x-2">
                <Palette className="w-4 h-4 text-pink-500" />
                <span>Tag Categories</span>
              </h2>
              <button onClick={() => setIsCategoriesModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Existing Categories */}
              <div className="space-y-2">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Active Categories</span>
                <div className="divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800">
                  {tagCategories.map((c) => (
                    <div key={c.name} className="p-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="font-bold text-slate-200 capitalize">{c.name}</span>
                      </div>
                      <code className="text-slate-500 text-[10px] font-mono">{c.color}</code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create Category Form */}
              <form onSubmit={handleCreateCategory} className="pt-3 border-t border-slate-800 space-y-3">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Add New Category</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Category name"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500"
                    required
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-10 h-8 rounded-lg bg-transparent cursor-pointer border border-slate-700"
                    />
                    <input
                      type="text"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isCreatingCat || !newCatName.trim()}
                  className="w-full py-2 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold text-xs"
                >
                  {isCreatingCat ? 'Creating...' : 'Create Category'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
