import React from 'react';
import { useSzuru } from './context/SzuruContext';
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

export const AppContent: React.FC = () => {
  const {
    api,
    activeMode,
    setActiveMode,
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

  const handleOpenDetails = (post: SzuruPost) => {
    setSelectedPost(post);
  };

  const handleOpenPostById = async (postId: number) => {
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
  };

  const handleOpenInReel = (postId: number) => {
    setReelInitialPostId(postId);
    setActiveMode('reel');
  };

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
