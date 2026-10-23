import React, { useState } from 'react';
import { useSzuru, AppNavMode } from '../context/SzuruContext';
import {
  Film,
  Grid,
  Tag,
  Upload,
  Settings,
  Wifi,
  WifiOff,
  AlertCircle,
  FolderOpen,
  MessageSquare,
  Users,
  History,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeMode,
    setActiveMode,
    setIsSettingsOpen,
    setIsUploadOpen,
    setIsHelpOpen,
    connectionStatus,
    instanceInfo,
  } = useSzuru();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { mode: AppNavMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'reel', label: 'Reels', icon: <Film className="w-4 h-4" /> },
    { mode: 'gallery', label: 'Gallery', icon: <Grid className="w-4 h-4" /> },
    { mode: 'pools', label: 'Pools', icon: <FolderOpen className="w-4 h-4" /> },
    { mode: 'tags', label: 'Tags', icon: <Tag className="w-4 h-4" /> },
    { mode: 'comments', label: 'Comments', icon: <MessageSquare className="w-4 h-4" /> },
    { mode: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { mode: 'snapshots', label: 'Activity', icon: <History className="w-4 h-4" /> },
  ];

  const handleNavClick = (mode: AppNavMode) => {
    setActiveMode(mode);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop / Top Header */}
      <header className="sticky top-0 z-40 h-16 bg-[#0c0d14]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => handleNavClick('reel')}
          className="flex items-center space-x-2.5 cursor-pointer group select-none shrink-0"
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
        <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 shadow-inner">
          {navItems.map((item) => (
            <button
              key={item.mode}
              onClick={() => handleNavClick(item.mode)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMode === item.mode
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Right Tools */}
        <div className="flex items-center space-x-2">
          {/* Search Help */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Search Syntax Cheatsheet"
          >
            <HelpCircle className="w-4 h-4 text-slate-400 hover:text-pink-400" />
          </button>

          {/* Connection Status Pill */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : connectionStatus === 'unconfigured'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
            }`}
            title="Click to configure Szurubooru connection"
          >
            {connectionStatus === 'connected' && <Wifi className="w-3.5 h-3.5" />}
            {connectionStatus === 'unconfigured' && <AlertCircle className="w-3.5 h-3.5" />}
            {connectionStatus === 'error' && <WifiOff className="w-3.5 h-3.5" />}
            <span className="capitalize truncate max-w-[120px]">
              {connectionStatus === 'connected'
                ? instanceInfo?.name || instanceInfo?.title || 'Connected'
                : connectionStatus === 'unconfigured'
                ? 'Set URL'
                : 'Disconnected'}
            </span>
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

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation (when hamburger clicked) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-50 bg-[#0c0d14]/98 backdrop-blur-2xl p-6 flex flex-col space-y-2 animate-fade-in">
          <span className="text-[10px] uppercase font-bold text-slate-500 mb-2">Sections</span>
          {navItems.map((item) => (
            <button
              key={item.mode}
              onClick={() => handleNavClick(item.mode)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition ${
                activeMode === item.mode
                  ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}

          <div className="pt-4 border-t border-slate-800 flex flex-col space-y-2">
            <button
              onClick={() => {
                setIsHelpOpen(true);
                setMobileMenuOpen(false);
              }}
              className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-900"
            >
              <HelpCircle className="w-5 h-5 text-pink-400" />
              <span>Search Syntax Reference</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0d14]/95 backdrop-blur-xl border-t border-slate-800/90 py-2 px-4 flex items-center justify-around">
        <button
          onClick={() => handleNavClick('reel')}
          className={`flex flex-col items-center space-y-1 transition ${
            activeMode === 'reel' ? 'text-pink-500' : 'text-slate-400'
          }`}
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px] font-bold">Reels</span>
        </button>

        <button
          onClick={() => handleNavClick('gallery')}
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
          onClick={() => handleNavClick('pools')}
          className={`flex flex-col items-center space-y-1 transition ${
            activeMode === 'pools' ? 'text-pink-500' : 'text-slate-400'
          }`}
        >
          <FolderOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold">Pools</span>
        </button>

        <button
          onClick={() => handleNavClick('tags')}
          className={`flex flex-col items-center space-y-1 transition ${
            activeMode === 'tags' ? 'text-pink-500' : 'text-slate-400'
          }`}
        >
          <Tag className="w-5 h-5" />
          <span className="text-[10px] font-bold">Tags</span>
        </button>
      </div>
    </>
  );
};
