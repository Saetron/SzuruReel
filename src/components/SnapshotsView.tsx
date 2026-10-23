import React, { useState, useEffect, useCallback } from 'react';
import { SzuruSnapshot } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import { History, Search, Loader2, Sparkles, PlusCircle, Edit3, Trash2, User, Clock, ArrowRight } from 'lucide-react';

interface SnapshotsViewProps {
  onOpenPost: (postId: number) => void;
  onOpenUser: (username: string) => void;
}

export const SnapshotsView: React.FC<SnapshotsViewProps> = ({ onOpenPost, onOpenUser }) => {
  const { api, showToast, setSelectedPoolId, setActiveMode, setSearchQuery } = useSzuru();

  const [snapshots, setSnapshots] = useState<SzuruSnapshot[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSnapshots = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getSnapshots({ query: search.trim(), limit: 40 });
      setSnapshots(res.results);
      setTotal(res.total);
    } catch (err: any) {
      showToast(`Failed to load snapshots: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [api, search, showToast]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const getOperationBadge = (op: string) => {
    switch (op.toLowerCase()) {
      case 'created':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <PlusCircle className="w-3 h-3" />
            <span>Created</span>
          </span>
        );
      case 'modified':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <Edit3 className="w-3 h-3" />
            <span>Modified</span>
          </span>
        );
      case 'deleted':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Trash2 className="w-3 h-3" />
            <span>Deleted</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {op}
          </span>
        );
    }
  };

  const handleResourceClick = (snap: SzuruSnapshot) => {
    const type = (snap.type || '').toLowerCase();
    const id = snap.resourceId || (snap as any).id;

    if (type === 'post' && id) {
      const numId = parseInt(String(id), 10);
      if (!isNaN(numId)) onOpenPost(numId);
    } else if (type === 'pool' && id) {
      const numId = parseInt(String(id), 10);
      if (!isNaN(numId)) {
        setSelectedPoolId(numId);
        setActiveMode('pools');
      }
    } else if (type === 'tag' && id) {
      setSearchQuery(String(id));
      setActiveMode('gallery');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2">
            <History className="w-6 h-6 text-pink-500" />
            <span>System Activity & Audit Log</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tracking historical edits across posts, tags, pools, and comments ({total} records)
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
              if (e.key === 'Enter') fetchSnapshots();
            }}
            placeholder="Search activity by user or resource..."
            className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {/* Snapshots Table / List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">No activity records found</p>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl divide-y divide-slate-800">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-850 transition text-xs"
            >
              <div className="flex items-center space-x-3 min-w-0">
                {getOperationBadge(snap.operation)}

                <div className="flex items-center space-x-2 min-w-0">
                  <span className="font-semibold text-slate-400 capitalize">{snap.type}</span>
                  <button
                    onClick={() => handleResourceClick(snap)}
                    className="font-bold text-slate-200 hover:text-pink-400 truncate hover:underline"
                  >
                    #{snap.resourceId || (snap as any).id || 'item'}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-slate-400">
                {snap.user?.name && (
                  <button
                    onClick={() => onOpenUser(snap.user!.name)}
                    className="flex items-center space-x-1.5 text-slate-300 hover:text-pink-400 font-semibold transition"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>@{snap.user.name}</span>
                  </button>
                )}

                <div className="flex items-center space-x-1 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(snap.time).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
