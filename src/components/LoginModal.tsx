import React, { useState, useEffect } from 'react';
import { useSzuru } from '../context/SzuruContext';
import {
  X,
  User,
  Key,
  LogIn,
  LogOut,
  RefreshCw,
  Shield,
  Upload,
  Heart,
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, login, logout, config, showToast } = useSzuru();

  const [username, setUsername] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsSwitchingAccount(false);
      setUsername(config.username || '');
      setApiToken(config.apiToken || '');
    }
  }, [isOpen, config.username, config.apiToken]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const res = await login(username, apiToken);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleLogout = () => {
    logout();
    setIsSwitchingAccount(false);
    setUsername('');
    setApiToken('');
    onClose();
  };

  const getRankColor = (rank?: string) => {
    switch (rank?.toLowerCase()) {
      case 'administrator':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'moderator':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'power':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">
                {currentUser && !isSwitchingAccount ? 'User Account' : 'Log In to Szurubooru'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {currentUser && !isSwitchingAccount
                  ? 'Manage your active session'
                  : 'Multi-user session for this browser'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {currentUser && !isSwitchingAccount ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="flex items-center space-x-3.5 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg font-black shrink-0 shadow-md">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    currentUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white truncate">{currentUser.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRankColor(
                        currentUser.rank
                      )}`}
                    >
                      {currentUser.rank || 'Regular'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 mt-1.5 text-slate-400 text-[11px]">
                    <div className="flex items-center space-x-1">
                      <Upload className="w-3.5 h-3.5 text-pink-400" />
                      <span>{currentUser.uploadCount ?? 0} uploads</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      <span>{currentUser.favoriteCount ?? 0} favs</span>
                    </div>
                  </div>
                </div>
              </div>

              {currentUser.creationTime && (
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 px-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Member since {new Date(currentUser.creationTime).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSwitchingAccount(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Switch Account</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold transition flex items-center justify-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Login Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Sign in with your personal Szurubooru credentials. Your session is saved locally in your browser, enabling multiple users on this deployment to interact independently.
              </p>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-pink-400" />
                  <span>Username</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. jdoe"
                  autoFocus
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Key className="w-3.5 h-3.5 text-pink-400" />
                    <span>API Token or Password</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    (Profile &rarr; API Tokens)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Enter API token or account password"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between space-x-2">
                {currentUser && isSwitchingAccount ? (
                  <button
                    type="button"
                    onClick={() => setIsSwitchingAccount(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    Browse Anonymously
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !username.trim() || !apiToken.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold transition flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-md shadow-pink-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Log In</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
