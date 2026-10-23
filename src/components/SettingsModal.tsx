import React, { useState, useEffect } from 'react';
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
  Network,
  RotateCcw,
  Container,
} from 'lucide-react';
import { PostSafety } from '../types/szuru';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    config,
    dockerConfig,
    currentUser,
    setIsLoginModalOpen,
    updateConfig,
    resetToDockerDefaults,
    testConnection,
    connectionStatus,
    instanceInfo,
    showToast,
  } = useSzuru();

  const [instanceUrl, setInstanceUrl] = useState(config.instanceUrl);
  const [useProxy, setUseProxy] = useState(config.useProxy);
  const [autoPlaySound, setAutoPlaySound] = useState(config.autoPlaySound);
  const [defaultSafety, setDefaultSafety] = useState<PostSafety | 'all'>(config.defaultSafety);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setInstanceUrl(config.instanceUrl);
    setUseProxy(config.useProxy);
    setAutoPlaySound(config.autoPlaySound);
    setDefaultSafety(config.defaultSafety);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      instanceUrl: instanceUrl.trim(),
      useProxy,
      autoPlaySound,
      defaultSafety,
    });
    showToast('Settings saved!', 'success');
    onClose();
  };

  const handleTest = async () => {
    setIsTesting(true);
    updateConfig({
      instanceUrl: instanceUrl.trim(),
      useProxy,
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
          {/* Docker Environment Variables Status Banner */}
          <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/10 flex flex-col space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <Container className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <p className="font-bold text-slate-100 text-xs">Docker Environment Configuration</p>
                  <p className="text-[11px] text-slate-400">
                    {dockerConfig?.instanceUrl
                      ? `Active container default: ${dockerConfig.instanceUrl}`
                      : 'Configure SZURU_URL in docker-compose.yml'}
                  </p>
                </div>
              </div>
              {dockerConfig?.instanceUrl && (
                <button
                  type="button"
                  onClick={resetToDockerDefaults}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-semibold border border-sky-500/30 flex items-center space-x-1 shrink-0 transition"
                  title="Reset fields to Docker environment variables"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Docker</span>
                </button>
              )}
            </div>
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
                The root URL of your Szurubooru instance (e.g. <code className="text-slate-400">https://booru.domain.com</code> or <code className="text-slate-400">http://szurubooru:8080</code>).
              </p>
            </div>

            {/* Active User Session & Multi-User Status */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-pink-400" />
                  <div>
                    <span className="font-semibold text-slate-200">Active User Session</span>
                    <p className="text-[10px] text-slate-400">
                      Multi-user mode: each user signs in via WebUI
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setIsLoginModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-[11px] font-semibold transition"
                >
                  {currentUser ? 'Manage / Switch' : 'Log In'}
                </button>
              </div>

              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Current User:</span>
                {currentUser ? (
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <span>{currentUser.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {currentUser.rank || 'Regular'}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Browsing Anonymously</span>
                )}
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
                      Routes requests via container backend to prevent browser CORS blocks
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
                disabled={isTesting || !instanceUrl.trim()}
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
                    <span>Connected ({instanceInfo?.name || instanceInfo?.title || 'Online'})</span>
                  </span>
                )}
                {connectionStatus === 'error' && (
                  <span className="text-rose-400 flex items-center space-x-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Connection Failed</span>
                  </span>
                )}
                {connectionStatus === 'unconfigured' && (
                  <span className="text-amber-400 font-medium">Instance URL not configured</span>
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
