import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { AppConfig, DockerServerConfig, PostSafety, SzuruInstanceInfo, SzuruPost, SzuruTagCategory } from '../types/szuru';
import { DEFAULT_TAG_CATEGORIES, SzuruApiService } from '../services/szuruApi';

interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export type AppNavMode = 'reel' | 'gallery' | 'pools' | 'tags' | 'comments' | 'users' | 'snapshots';

interface SzuruContextType {
  config: AppConfig;
  dockerConfig: DockerServerConfig | null;
  updateConfig: (newConfig: Partial<AppConfig>) => void;
  resetToDockerDefaults: () => void;
  api: SzuruApiService;
  activeMode: AppNavMode;
  setActiveMode: (mode: AppNavMode) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  safetyFilter: PostSafety | 'all';
  setSafetyFilter: (s: PostSafety | 'all') => void;
  selectedPost: SzuruPost | null;
  setSelectedPost: (p: SzuruPost | null) => void;
  selectedUserName: string | null;
  setSelectedUserName: (name: string | null) => void;
  selectedPoolId: number | null;
  setSelectedPoolId: (id: number | null) => void;
  reelInitialPostId: number | null;
  setReelInitialPostId: (id: number | null) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isUploadOpen: boolean;
  setIsUploadOpen: (open: boolean) => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
  tagCategories: SzuruTagCategory[];
  refreshTagCategories: () => Promise<void>;
  connectionStatus: 'connected' | 'error' | 'testing' | 'unconfigured';
  instanceInfo: SzuruInstanceInfo | null;
  testConnection: () => Promise<boolean>;
  toasts: ToastItem[];
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

const DEFAULT_CONFIG: AppConfig = {
  instanceUrl: '',
  username: '',
  apiToken: '',
  useProxy: true,
  autoPlaySound: false,
  defaultSafety: 'all',
  defaultSort: 'date-desc',
};

const SzuruContext = createContext<SzuruContextType | null>(null);

export const SzuruProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dockerConfig, setDockerConfig] = useState<DockerServerConfig | null>(null);

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

  const [activeMode, setActiveMode] = useState<AppNavMode>('reel');
  const [searchQuery, setSearchQuery] = useState('');
  const [safetyFilter, setSafetyFilter] = useState<PostSafety | 'all'>('all');
  const [selectedPost, setSelectedPost] = useState<SzuruPost | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [reelInitialPostId, setReelInitialPostId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [tagCategories, setTagCategories] = useState<SzuruTagCategory[]>(DEFAULT_TAG_CATEGORIES);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'testing' | 'unconfigured'>('unconfigured');
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

  const resetToDockerDefaults = useCallback(() => {
    try {
      localStorage.removeItem('szuru_reel_config');
    } catch {
      // ignore
    }
    if (dockerConfig) {
      setConfig({
        instanceUrl: dockerConfig.instanceUrl,
        username: dockerConfig.username,
        apiToken: dockerConfig.apiToken,
        useProxy: dockerConfig.useProxy,
        defaultSafety: dockerConfig.defaultSafety || 'all',
        autoPlaySound: dockerConfig.autoPlaySound || false,
        defaultSort: dockerConfig.defaultSort || 'date-desc',
      });
      showToast('Reset to Docker environment configuration', 'info');
    }
  }, [dockerConfig, showToast]);

  const refreshTagCategories = useCallback(async () => {
    try {
      const cats = await api.getTagCategories();
      setTagCategories(cats);
    } catch {
      // ignore
    }
  }, [api]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!config.instanceUrl || !config.instanceUrl.trim()) {
      setConnectionStatus('unconfigured');
      setInstanceInfo(null);
      return false;
    }

    setConnectionStatus('testing');
    try {
      const info = await api.getInfo();
      setInstanceInfo(info);
      setConnectionStatus('connected');
      showToast(`Connected to ${info.name || info.title || 'Szurubooru'}!`, 'success');

      refreshTagCategories();
      return true;
    } catch (err: any) {
      setConnectionStatus('error');
      showToast(`Connection failed: ${err.message || 'Check URL/credentials'}`, 'error');
      return false;
    }
  }, [api, config.instanceUrl, refreshTagCategories, showToast]);

  // Load Docker environment variables from server endpoint
  useEffect(() => {
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DockerServerConfig | null) => {
        if (data) {
          setDockerConfig(data);

          const hasLocalConfig = Boolean(localStorage.getItem('szuru_reel_config'));
          if (!hasLocalConfig && data.instanceUrl) {
            setConfig({
              instanceUrl: data.instanceUrl,
              username: data.username || '',
              apiToken: data.apiToken || '',
              useProxy: data.useProxy ?? true,
              defaultSafety: data.defaultSafety || 'all',
              autoPlaySound: data.autoPlaySound || false,
              defaultSort: data.defaultSort || 'date-desc',
            });
            setSafetyFilter(data.defaultSafety || 'all');
          }
        }
      })
      .catch(() => {
        // Dev server standalone
      });
  }, []);

  // When config.instanceUrl changes or is initially populated, run connection check
  useEffect(() => {
    if (config.instanceUrl && config.instanceUrl.trim()) {
      testConnection();
    } else {
      setConnectionStatus('unconfigured');
    }
  }, [config.instanceUrl, testConnection]);

  return (
    <SzuruContext.Provider
      value={{
        config,
        dockerConfig,
        updateConfig,
        resetToDockerDefaults,
        api,
        activeMode,
        setActiveMode,
        searchQuery,
        setSearchQuery,
        safetyFilter,
        setSafetyFilter,
        selectedPost,
        setSelectedPost,
        selectedUserName,
        setSelectedUserName,
        selectedPoolId,
        setSelectedPoolId,
        reelInitialPostId,
        setReelInitialPostId,
        isSettingsOpen,
        setIsSettingsOpen,
        isUploadOpen,
        setIsUploadOpen,
        isHelpOpen,
        setIsHelpOpen,
        tagCategories,
        refreshTagCategories,
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
