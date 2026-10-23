import React, { useEffect, useCallback, useRef } from 'react';
import { useSzuru, AppNavMode } from './context/SzuruContext';
import { Navbar } from './components/Navbar';
import { ReelMode } from './components/ReelMode';
import { GalleryMode } from './components/GalleryMode';
import { PoolsView } from './components/PoolsView';
import { TagExplorer } from './components/TagExplorer';
import { CommentsView } from './components/CommentsView';
import { UsersView } from './components/UsersView';
import { SnapshotsView } from './components/SnapshotsView';
import { PostDetailModal } from './components/PostDetailModal';
import { UserProfileModal } from './components/UserProfileModal';
import { UploadModal } from './components/UploadModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { SearchHelpModal } from './components/SearchHelpModal';
import { ToastContainer } from './components/Toast';
import { SzuruPost } from './types/szuru';

const getRouteStateFromLocation = () => {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  // 1. Post matching: /post/123 or /posts/123 or ?post=123
  const postMatch = path.match(/^\/posts?\/(\d+)/i);
  const postId = postMatch
    ? parseInt(postMatch[1], 10)
    : searchParams.get('post')
    ? parseInt(searchParams.get('post')!, 10)
    : null;

  // 2. User matching: /user/name or /users/name (ignoring /users list view) or ?user=name
  const userMatch = path.match(/^\/users?\/([^/]+)/i);
  let userName = userMatch ? decodeURIComponent(userMatch[1]) : searchParams.get('user') || null;
  if (userName && (userName.toLowerCase() === 'users' || userName.toLowerCase() === 'user')) {
    userName = null;
  }

  // 3. Navigation Mode matching
  let mode: AppNavMode = 'reel';
  if (path.startsWith('/tags')) mode = 'tags';
  else if (path.startsWith('/gallery')) mode = 'gallery';
  else if (path.startsWith('/pools')) mode = 'pools';
  else if (path.startsWith('/comments')) mode = 'comments';
  else if (path.startsWith('/users')) mode = 'users';
  else if (path.startsWith('/snapshots')) mode = 'snapshots';
  else if (path.startsWith('/reel') || path === '/') mode = 'reel';

  // 4. Search query
  const query = searchParams.get('query') || searchParams.get('search') || searchParams.get('q') || '';

  return { postId, userName, mode, query };
};

export const AppContent: React.FC = () => {
  const {
    api,
    activeMode,
    setActiveMode,
    searchQuery,
    setSearchQuery,
    selectedPost,
    setSelectedPost,
    selectedUserName,
    setSelectedUserName,
    setReelInitialPostId,
    isUploadOpen,
    setIsUploadOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isLoginModalOpen,
    setIsLoginModalOpen,
    isHelpOpen,
    setIsHelpOpen,
  } = useSzuru();

  const isInitialRouteHandled = useRef(false);

  const handleOpenDetails = useCallback((post: SzuruPost) => {
    setSelectedPost(post);
  }, [setSelectedPost]);

  const handleOpenPostById = useCallback(async (postId: number) => {
    try {
      const fullPost = await api.getPost(postId);
      setSelectedPost(fullPost);
    } catch {
      // fallback minimal post object
      setSelectedPost({
        id: postId,
        version: 1,
        creationTime: new Date().toISOString(),
        safety: 'safe',
        type: 'image',
        mimeType: 'image/jpeg',
        checksum: '',
        fileSize: 0,
        canvasWidth: 1000,
        canvasHeight: 1000,
        contentUrl: '',
        thumbnailUrl: '',
        flags: [],
        tags: [],
        score: 0,
      });
    }
  }, [api, setSelectedPost]);

  const handleOpenInReel = useCallback((postId: number) => {
    setReelInitialPostId(postId);
    setActiveMode('reel');
  }, [setReelInitialPostId, setActiveMode]);

  // Initial Route Hydration (Handles direct page loads/refreshes like /tags, /post/123, /gallery)
  useEffect(() => {
    if (isInitialRouteHandled.current) return;
    isInitialRouteHandled.current = true;

    const route = getRouteStateFromLocation();
    if (route.mode !== activeMode) {
      setActiveMode(route.mode);
    }
    if (route.query) {
      setSearchQuery(route.query);
    }
    if (route.postId) {
      handleOpenPostById(route.postId);
    } else if (route.userName) {
      setSelectedUserName(route.userName);
    }
  }, [activeMode, setActiveMode, setSearchQuery, handleOpenPostById, setSelectedUserName]);

  // Popstate Listener (Browser Back/Forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const route = getRouteStateFromLocation();
      setActiveMode(route.mode);
      if (route.query) {
        setSearchQuery(route.query);
      }
      if (route.postId) {
        handleOpenPostById(route.postId);
      } else {
        setSelectedPost(null);
      }
      if (route.userName) {
        setSelectedUserName(route.userName);
      } else {
        setSelectedUserName(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveMode, setSearchQuery, handleOpenPostById, setSelectedPost, setSelectedUserName]);

  // URL Synchronization on UI state transitions
  useEffect(() => {
    let targetPath = '/';
    let targetQuery = '';

    if (selectedPost) {
      targetPath = `/post/${selectedPost.id}`;
    } else if (selectedUserName) {
      targetPath = `/user/${encodeURIComponent(selectedUserName)}`;
    } else {
      if (activeMode === 'reel') {
        targetPath = '/';
      } else {
        targetPath = `/${activeMode}`;
        if (activeMode === 'gallery' && searchQuery.trim()) {
          targetQuery = `?query=${encodeURIComponent(searchQuery.trim())}`;
        }
      }
    }

    const currentUrl = window.location.pathname + window.location.search;
    const nextUrl = targetPath + targetQuery;

    if (currentUrl !== nextUrl) {
      window.history.pushState(null, '', nextUrl);
    }
  }, [activeMode, selectedPost?.id, selectedUserName, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0c0d14] text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white pb-16 lg:pb-0">
      <Navbar />

      <main className="flex-1 w-full flex flex-col">
        {activeMode === 'reel' && (
          <ReelMode onOpenDetails={handleOpenDetails} />
        )}

        {activeMode === 'gallery' && (
          <GalleryMode
            onOpenDetails={handleOpenDetails}
            onOpenInReel={handleOpenInReel}
          />
        )}

        {activeMode === 'pools' && (
          <PoolsView
            onOpenPost={handleOpenPostById}
            onOpenInReel={handleOpenInReel}
          />
        )}

        {activeMode === 'tags' && <TagExplorer />}

        {activeMode === 'comments' && (
          <CommentsView
            onOpenPost={handleOpenPostById}
            onOpenUser={(name) => setSelectedUserName(name)}
          />
        )}

        {activeMode === 'users' && (
          <UsersView
            onSelectUser={(name) => setSelectedUserName(name)}
          />
        )}

        {activeMode === 'snapshots' && (
          <SnapshotsView
            onOpenPost={handleOpenPostById}
            onOpenUser={(name) => setSelectedUserName(name)}
          />
        )}
      </main>

      {/* Modals */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onOpenInReel={handleOpenInReel}
          onPostUpdated={(updated) => setSelectedPost(updated)}
        />
      )}

      {selectedUserName && (
        <UserProfileModal
          username={selectedUserName}
          onClose={() => setSelectedUserName(null)}
          onOpenPost={handleOpenPostById}
          onOpenInReel={handleOpenInReel}
        />
      )}

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onOpenExistingPost={handleOpenPostById}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <SearchHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
