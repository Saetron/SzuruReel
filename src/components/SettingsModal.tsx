import React, { useState } from 'react';
import { useSzuru } from '../context/SzuruContext';
import {
  X,
  Settings as SettingsIcon,
  Server,
  Key,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Volume2,
  Sparkles,
  Network,
} from 'lucide-react';
import { PostSafety } from '../types/szuru';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    config,
    updateConfig,
    testConnection,
    connectionStatus,
    instanceInfo,
    showToast,
  } = useSzuru();

  const [instanceUrl, setInstanceUrl] = useState(config.instanceUrl);
  const [username, setUsername] = useState(config.username);
  const [apiToken, setApiToken] = useState(config.apiToken);
  const [useProxy, setUseProxy] = useState(config.useProxy);
  const [isDemoMode, setIsDemoMode] = useState(config.isDemoMode);
  const [autoPlaySound, setAutoPlaySound] = useState(config.autoPlaySound);
  const [defaultSafety, setDefaultSafety] = useState<PostSafety | 'all'>(config.defaultSafety);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      instanceUrl: instanceUrl.trim(),
      username: username.trim(),
      apiToken: apiToken.trim(),
      useProxy,
      isDemoMode,
      autoPlaySound,
      defaultSafety,
    });
    showToast('Settings saved!', 'success');
    onClose();
  };

  const handleTest = async () => {
    setIsTesting(true);
    // Apply changes locally to test
    updateConfig({
      instanceUrl: instanceUrl.trim(),
      username: username.trim(),
      apiToken: apiToken.trim(),
      useProxy,
      isDemoMode,
    });
    await testConnection();
    setIsTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-pink-500" />
            <h2 className="font-bold text-base text-white">Connection & Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Demo Mode Toggle Banner */}
          <div className="p-3.5 rounded-xl border border-pink-500/30 bg-pink-500/10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-pink-400 shrink-0" />
              <div>
                <p className="font-bold text-slate-100 text-xs">Demo Preview Mode</p>
                <p className="text-[11px] text-slate-400">
                  Try out the TikTok reel mode with sample animated and video posts
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDemoMode}
                onChange={(e) => setIsDemoMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
            </label>
          </div>

          {/* Szurubooru Instance Settings */}
          <div className="space-y-3 pt-1">
            <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-pink-400" />
              <span>Szurubooru Instance</span>
            </h3>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Instance Base URL</label>
              <input
                type="url"
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                placeholder="https://booru.example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-pink-500 font-mono text-xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                The root URL of your Szurubooru installation (no /api suffix).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center space-x-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Username</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Optional username"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-pink-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center space-x-1">
                  <Key className="w-3 h-3 text-slate-400" />
                  <span>API Token</span>
                </label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="API token / password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-pink-500 font-mono text-xs"
                />
              </div>
            </div>

            {/* Connection Mode / Proxy Toggle */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Network className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="font-semibold text-slate-200">Container CORS Proxy</span>
                    <p className="text-[10px] text-slate-400">
                      Bypasses browser CORS restrictions when contacting remote instances
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useProxy}
                    onChange={(e) => setUseProxy(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>
            </div>

            {/* Test Connection Button & Status */}
            <div className="pt-1 flex items-center space-x-3">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              <div className="flex items-center space-x-1.5 text-xs">
                {connectionStatus === 'connected' && (
                  <span className="text-emerald-400 flex items-center space-x-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connected ({instanceInfo?.name || 'Online'})</span>
                  </span>
                )}
                {connectionStatus === 'error' && (
                  <span className="text-rose-400 flex items-center space-x-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Connection Failed</span>
                  </span>
                )}
                {connectionStatus === 'demo' && (
                  <span className="text-pink-400 font-semibold">Demo Mode Active</span>
                )}
              </div>
            </div>
          </div>

          {/* Reel & Playback Preferences */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
              <Volume2 className="w-3.5 h-3.5 text-pink-400" />
              <span>Player & Preferences</span>
            </h3>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <span className="font-semibold text-slate-200">Default Unmuted Audio</span>
                <p className="text-[10px] text-slate-500">
                  Allow video reels to start with sound if allowed by browser policy
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPlaySound}
                  onChange={(e) => setAutoPlaySound(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-pink-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Default Safety Filter</label>
              <select
                value={defaultSafety}
                onChange={(e) => setDefaultSafety(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-pink-500"
              >
                <option value="all">All (Safe, Sketchy, Unsafe)</option>
                <option value="safe">Safe Only</option>
                <option value="sketchy">Safe & Sketchy</option>
                <option value="unsafe">Unsafe Only</option>
              </select>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-lg shadow-pink-500/30 transition-transform active:scale-98"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
