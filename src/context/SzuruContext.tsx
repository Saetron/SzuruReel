import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { AppConfig, PostSafety, SzuruInstanceInfo, SzuruPost, SzuruTagCategory } from '../types/szuru';
import { SzuruApiService } from '../services/szuruApi';
import { MOCK_CATEGORIES } from '../services/mockData';

interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface SzuruContextType {
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => void;
  api: SzuruApiService;
  activeMode: 'reel' | 'gallery' | 'tags';
  setActiveMode: (mode: 'reel' | 'gallery' | 'tags') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  safetyFilter: PostSafety | 'all';
  setSafetyFilter: (s: PostSafety | 'all') => void;
  selectedPost: SzuruPost | null;
  setSelectedPost: (p: SzuruPost | null) => void;
  reelInitialPostId: number | null;
  setReelInitialPostId: (id: number | null) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isUploadOpen: boolean;
  setIsUploadOpen: (open: boolean) => void;
  tagCategories: SzuruTagCategory[];
  connectionStatus: 'connected' | 'error' | 'testing' | 'demo';
  instanceInfo: SzuruInstanceInfo | null;
  testConnection: () => Promise<boolean>;
  toasts: ToastItem[];
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

const DEFAULT_CONFIG: AppConfig = {
  instanceUrl: 'http://localhost:8080',
  username: '',
  apiToken: '',
  useProxy: false,
  isDemoMode: true, // Default to demo mode for instant working preview!
  autoPlaySound: false,
  defaultSafety: 'all',
  defaultSort: 'date-desc',
};

const SzuruContext = createContext<SzuruContextType | null>(null);

export const SzuruProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const stored = localStorage.getItem('szuru_reel_config');
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  });

  const [activeMode, setActiveMode] = useState<'reel' | 'gallery' | 'tags'>('reel');
  const [searchQuery, setSearchQuery] = useState('');
  const [safetyFilter, setSafetyFilter] = useState<PostSafety | 'all'>('all');
  const [selectedPost, setSelectedPost] = useState<SzuruPost | null>(null);
  const [reelInitialPostId, setReelInitialPostId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [tagCategories, setTagCategories] = useState<SzuruTagCategory[]>(MOCK_CATEGORIES);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'testing' | 'demo'>('demo');
  const [instanceInfo, setInstanceInfo] = useState<SzuruInstanceInfo | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const api = useMemo(() => new SzuruApiService(config), [config]);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateConfig = useCallback((newConfig: Partial<AppConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem('szuru_reel_config', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (config.isDemoMode) {
      setConnectionStatus('demo');
      setInstanceInfo({
        name: 'SzuruReel Demo Booru',
        version: '1.20-demo',
      });
      return true;
    }

    setConnectionStatus('testing');
    try {
      const info = await api.getInfo();
      setInstanceInfo(info);
      setConnectionStatus('connected');
      showToast(`Connected to ${info.name || 'Szurubooru'}!`, 'success');

      // Fetch categories in background
      api.getTagCategories().then(setTagCategories).catch(() => {});
      return true;
    } catch (err: any) {
      setConnectionStatus('error');
      showToast(`Connection failed: ${err.message || 'Check URL/credentials'}`, 'error');
      return false;
    }
  }, [api, config.isDemoMode, showToast]);

  // Initial setup: check server / demo status
  useEffect(() => {
    // If not in demo mode, test connection silently
    if (!config.isDemoMode) {
      testConnection();
    } else {
      setConnectionStatus('demo');
    }
  }, [config.isDemoMode, testConnection]);

  // Also query container runtime default configs if served from our node server
  useEffect(() => {
    fetch('/api/server-info')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverData) => {
        if (serverData && serverData.defaultUrl && !localStorage.getItem('szuru_reel_config')) {
          updateConfig({
            instanceUrl: serverData.defaultUrl || config.instanceUrl,
            username: serverData.defaultUser || config.username,
            apiToken: serverData.defaultToken || config.apiToken,
            isDemoMode: false,
          });
        }
      })
      .catch(() => {
        // standalone vite dev mode, fine
      });
  }, [updateConfig, config.instanceUrl, config.username, config.apiToken]);

  return (
    <SzuruContext.Provider
      value={{
        config,
        updateConfig,
        api,
        activeMode,
        setActiveMode,
        searchQuery,
        setSearchQuery,
        safetyFilter,
        setSafetyFilter,
        selectedPost,
        setSelectedPost,
        reelInitialPostId,
        setReelInitialPostId,
        isSettingsOpen,
        setIsSettingsOpen,
        isUploadOpen,
        setIsUploadOpen,
        tagCategories,
        connectionStatus,
        instanceInfo,
        testConnection,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </SzuruContext.Provider>
  );
};

export const useSzuru = () => {
  const context = useContext(SzuruContext);
  if (!context) {
    throw new Error('useSzuru must be used within a SzuruProvider');
  }
  return context;
};
