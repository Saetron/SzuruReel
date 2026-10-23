import React, { useState, useEffect, useCallback } from 'react';
import { SzuruFullUser } from '../types/szuru';
import { useSzuru } from '../context/SzuruContext';
import { Users as UsersIcon, Search, Sparkles, Loader2, Calendar, UploadCloud, Bookmark, Shield, ArrowRight } from 'lucide-react';

interface UsersViewProps {
  onSelectUser: (username: string) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ onSelectUser }) => {
  const { api, showToast } = useSzuru();

  const [users, setUsers] = useState<SzuruFullUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers({ query: search.trim(), limit: 50 });
      setUsers(res.results);
    } catch (err: any) {
      showToast(`Failed to load users: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [api, search, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getRankBadgeColor = (rank?: string) => {
    switch (rank?.toLowerCase()) {
      case 'administrator':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'moderator':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'power':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2">
            <UsersIcon className="w-6 h-6 text-pink-500" />
            <span>Community Users</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Registered contributors, moderators, and artists
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
              if (e.key === 'Enter') fetchUsers();
            }}
            placeholder="Search username..."
            className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {/* Users Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">No users found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {users.map((user) => (
            <div
              key={user.name}
              onClick={() => onSelectUser(user.name)}
              className="group bg-slate-900/90 border border-slate-800 hover:border-pink-500/40 rounded-2xl p-4 shadow-xl cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow shrink-0">
                  <div className="w-full h-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center font-black text-white text-base">
                    {user.avatarUrl ? (
                      <img src={api.resolveMediaUrl(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="font-bold text-sm text-white group-hover:text-pink-400 transition-colors truncate">
                      {user.name}
                    </h3>
                  </div>

                  {user.rank && (
                    <span
                      className={`inline-block text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border mt-1 ${getRankBadgeColor(
                        user.rank
                      )}`}
                    >
                      {user.rank}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center space-x-3">
                  {user.uploadCount !== undefined && (
                    <span className="flex items-center space-x-1 text-slate-300" title="Uploads">
                      <UploadCloud className="w-3.5 h-3.5 text-pink-400" />
                      <span>{user.uploadCount}</span>
                    </span>
                  )}
                  {user.favoriteCount !== undefined && (
                    <span className="flex items-center space-x-1 text-slate-300" title="Favorites">
                      <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                      <span>{user.favoriteCount}</span>
                    </span>
                  )}
                </div>

                <span className="flex items-center space-x-1 text-pink-400 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
