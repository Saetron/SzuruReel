import React from 'react';
import { X, HelpCircle, Search, Sparkles, Filter, Code } from 'lucide-react';

interface SearchHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchHelpModal: React.FC<SearchHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const syntaxItems = [
    {
      category: 'Basic Tag Searching',
      examples: [
        { code: 'cat dog', desc: 'Find posts that have both "cat" AND "dog" tags.' },
        { code: 'cat,dog', desc: 'Find posts that have EITHER "cat" OR "dog" (comma = OR).' },
        { code: '-dog', desc: 'Exclude posts containing the "dog" tag.' },
        { code: 'cyber*', desc: 'Wildcard match: tags starting with "cyber" (e.g. cyberpunk, cybernetic).' },
      ],
    },
    {
      category: 'Safety & Content Ratings',
      examples: [
        { code: 'safety:safe', desc: 'Only posts marked as safe.' },
        { code: 'safety:sketchy', desc: 'Only posts marked as sketchy / questionable.' },
        { code: 'safety:unsafe', desc: 'Only posts marked as unsafe / explicit.' },
        { code: '-safety:unsafe', desc: 'Exclude unsafe posts.' },
      ],
    },
    {
      category: 'Media Types & Flags',
      examples: [
        { code: 'type:video', desc: 'Videos (MP4, WebM).' },
        { code: 'type:image', desc: 'Static images (JPG, PNG, WebP).' },
        { code: 'type:animation', desc: 'Animated GIF or WebP.' },
        { code: 'flag:loop', desc: 'Posts flagged as looping seamlessly.' },
      ],
    },
    {
      category: 'Numeric & Date Filters',
      examples: [
        { code: 'score:>10', desc: 'Posts with a score greater than 10.' },
        { code: 'score:0..50', desc: 'Posts with score between 0 and 50.' },
        { code: 'width:>1920', desc: 'Width greater than 1920 pixels.' },
        { code: 'height:>1080', desc: 'Height greater than 1080 pixels.' },
        { code: 'date:>2024-01-01', desc: 'Posts created after January 1st, 2024.' },
      ],
    },
    {
      category: 'Users & Pools',
      examples: [
        { code: 'uploader:alice', desc: 'Posts uploaded by the user "alice".' },
        { code: 'fav:bob', desc: 'Posts favorited by the user "bob".' },
        { code: 'pool:12', desc: 'Posts belonging to pool ID 12.' },
        { code: 'special:liked', desc: 'Posts you personally upvoted (when authenticated).' },
        { code: 'special:fav', desc: 'Posts you have favorited.' },
      ],
    },
    {
      category: 'Sorting Order',
      examples: [
        { code: 'sort:date-desc', desc: 'Newest uploads first (default).' },
        { code: 'sort:date-asc', desc: 'Oldest uploads first.' },
        { code: 'sort:score-desc', desc: 'Highest scored posts first.' },
        { code: 'sort:random', desc: 'Random order on every refresh.' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-pink-500" />
            <h2 className="font-bold text-base text-white">Szurubooru Search Syntax Reference</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center space-x-2.5 text-pink-300">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              Combine any number of terms separated by spaces in both <strong>Gallery</strong> and <strong>Reel</strong> modes!
            </span>
          </div>

          <div className="space-y-6">
            {syntaxItems.map((group) => (
              <div key={group.category} className="space-y-2">
                <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <Filter className="w-3.5 h-3.5 text-pink-400" />
                  <span>{group.category}</span>
                </h3>

                <div className="grid grid-cols-1 gap-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
                  {group.examples.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg hover:bg-slate-900/60 transition gap-1 sm:gap-4"
                    >
                      <code className="text-pink-400 bg-slate-900 px-2 py-0.5 rounded font-mono text-[11px] shrink-0 border border-slate-800">
                        {item.code}
                      </code>
                      <span className="text-slate-400 text-xs sm:text-right">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
