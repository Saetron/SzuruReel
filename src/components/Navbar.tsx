import React from 'react';
import { useSzuru } from '../context/SzuruContext';
import {
  Film,
  Grid,
  Tag,
  Upload,
  Settings,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeMode,
    setActiveMode,
    setIsSettingsOpen,
    setIsUploadOpen,
    connectionStatus,
    instanceInfo,
  } = useSzuru();

  return (
    <>
      {/* Desktop / Top Header */}
      <header className="sticky top-0 z-40 h-16 bg-[#0c0d14]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setActiveMode('reel')}
          className="flex items-center space-x-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25 group-hover:scale-105 transition-transform">
            <Film className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Szuru<span className="text-pink-500">Reel</span>
            </span>
          </div>
        </div>

        {/* Central Nav Tabs (Desktop) */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 shadow-inner">
          <button
            onClick={() => setActiveMode('reel')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'reel'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Reels</span>
          </button>

          <button
            onClick={() => setActiveMode('gallery')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'gallery'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Gallery</span>
          </button>

          <button
            onClick={() => setActiveMode('tags')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'tags'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Tags</span>
          </button>
        </nav>

        {/* Right Tools */}
        <div className="flex items-center space-x-2.5">
          {/* Connection Status Pill */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : connectionStatus === 'demo'
                ? 'bg-pink-500/10 text-pink-400 border-pink-500/30 hover:bg-pink-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
            }`}
          >
            {connectionStatus === 'connected' && <Wifi className="w-3.5 h-3.5" />}
            {connectionStatus === 'demo' && <Sparkles className="w-3.5 h-3.5" />}
            {connectionStatus === 'error' && <WifiOff className="w-3.5 h-3.5" />}
            <span className="capitalize">{instanceInfo?.name || connectionStatus}</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 flex items-center space-x-1.5 text-xs font-semibold transition shadow-sm"
            title="Upload post"
          >
            <Upload className="w-4 h-4 text-pink-400" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition shadow-sm"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0d14]/95 backdrop-blur-xl border-t border-slate-800/90 py-2 px-6 flex items-center justify-around">
        <button
          onClick={() => setActiveMode('reel')}
          className={`flex flex-col items-center space-y-1 transition ${
            activeMode === 'reel' ? 'text-pink-500' : 'text-slate-400'
          }`}
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px] font-bold">Reels</span>
        </button>

        <button
          onClick={() => setActiveMode('gallery')}
          className={`flex flex-col items-center space-y-1 transition ${
            activeMode === 'gallery' ? 'text-pink-500' : 'text-slate-400'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px] font-bold">Gallery</span>
        </button>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex flex-col items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30"
          title="Upload"
        >
          <Upload className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveMode('tags')}
          className={`flex flex-col items-center space-y-1 transition ${
            activeMode === 'tags' ? 'text-pink-500' : 'text-slate-400'
          }`}
        >
          <Tag className="w-5 h-5" />
          <span className="text-[10px] font-bold">Tags</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex flex-col items-center space-y-1 text-slate-400 hover:text-white transition"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold">Config</span>
        </button>
      </div>
    </>
  );
};
