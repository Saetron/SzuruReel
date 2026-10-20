import React, { useState } from 'react';
import { useSzuru } from './context/SzuruContext';
import { Navbar } from './components/Navbar';
import { ReelMode } from './components/ReelMode';
import { GalleryMode } from './components/GalleryMode';
import { TagExplorer } from './components/TagExplorer';
import { PostDetailModal } from './components/PostDetailModal';
import { UploadModal } from './components/UploadModal';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/Toast';
import { SzuruPost } from './types/szuru';

export const AppContent: React.FC = () => {
  const {
    activeMode,
    setActiveMode,
    selectedPost,
    setSelectedPost,
    setReelInitialPostId,
    isUploadOpen,
    setIsUploadOpen,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useSzuru();

  const handleOpenDetails = (post: SzuruPost) => {
    setSelectedPost(post);
  };

  const handleOpenInReel = (postId: number) => {
    setReelInitialPostId(postId);
    setActiveMode('reel');
  };

  return (
    <div className="min-h-screen bg-[#0c0d14] text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
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

        {activeMode === 'tags' && <TagExplorer />}
      </main>

      {/* Modals */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onOpenInReel={handleOpenInReel}
        />
      )}

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
