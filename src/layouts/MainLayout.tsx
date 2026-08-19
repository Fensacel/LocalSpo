import { Outlet, useLocation } from 'react-router-dom';
import { Titlebar } from '@/components/Titlebar';
import { Sidebar } from '@/components/Sidebar';
import { MiniPlayer } from '@/components/MiniPlayer';
import { MobileTopAppBar } from '@/components/MobileTopAppBar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { usePlayerStore } from '@/stores';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { extractDominantColor, getImageUrl } from '@/utils';
import { NowPlayingOverlay } from '@/features/player/NowPlayingOverlay';
import { QueuePanel } from '@/components/QueuePanel';
import { LyricsView } from '@/features/lyrics/LyricsView';
import { NowPlayingPanel } from '@/components/NowPlayingPanel';
import { ToastContainer } from '@/components/ToastContainer';
import { UpdateModal } from '@/components/UpdateModal';
import { WhatsNewModal } from '@/components/WhatsNewModal';
import { useChatUnread } from '@/hooks/useChatUnread';

export function MainLayout() {
  useChatUnread();
  const location = useLocation();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const showNowPlaying = usePlayerStore((s) => s.showNowPlaying);
  const showNowPlayingSidebar = usePlayerStore((s) => s.showNowPlayingSidebar);
  const toggleNowPlayingSidebar = usePlayerStore((s) => s.toggleNowPlayingSidebar);
  const showLyrics = usePlayerStore((s) => s.showLyrics);
  const showQueue = usePlayerStore((s) => s.showQueue);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const [bgColor, setBgColor] = useState<[number, number, number]>([0, 112, 243]);

  // Dynamic ambient background color extraction from album cover
  useEffect(() => {
    if (currentSong?.coverPath) {
      const src = getImageUrl(currentSong.coverPath);
      extractDominantColor(src).then(setBgColor);
    } else {
      setBgColor([0, 112, 243]);
    }
  }, [currentSong?.coverPath]);

  // Auto-close lyrics and now playing overlays on route change
  useEffect(() => {
    usePlayerStore.setState({ showLyrics: false, showNowPlaying: false });
  }, [location.pathname]);

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#0B0B0D] text-[#E5E2E1]">
      {/* Subtle dynamic ambient background glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0 opacity-40"
        animate={{
          background: `radial-gradient(ellipse at 50% 10%, rgba(${bgColor[0]},${bgColor[1]},${bgColor[2]},0.12) 0%, transparent 70%)`,
        }}
        transition={{ duration: 0.8 }}
      />

      {/* Top Titlebar */}
      <Titlebar />

      {/* Mobile Top App Bar */}
      <MobileTopAppBar />

      {/* Three-Column Desktop Layout */}
      <div className="flex flex-1 min-h-0 relative z-10 overflow-hidden">
        {/* LEFT COLUMN: Sidebar Navigation */}
        <Sidebar />

        {/* CENTER COLUMN: Main Content Outlet */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-thin">
          <AnimatePresence mode="wait">
            {showLyrics ? (
              <motion.div
                key="lyrics-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute inset-0 z-10 p-4 md:p-6"
              >
                <LyricsView />
              </motion.div>
            ) : (
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="p-4 md:px-6 md:pt-6 pb-[120px] md:pb-[130px]"
              >
                <Outlet />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* RIGHT COLUMN OPTIONS: Queue Panel / Now Playing Panel */}
        <AnimatePresence>
          {showQueue && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="h-full border-l border-white/5 bg-[#131313]/95 backdrop-blur-xl flex flex-col shrink-0 overflow-hidden z-20"
            >
              <div className="w-[340px] h-full flex flex-col">
                <QueuePanel onClose={toggleQueue} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* RIGHT COLUMN: Dedicated Now Playing Panel */}
        <AnimatePresence>
          {showNowPlayingSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="h-full border-l border-white/5 bg-[#131313]/95 backdrop-blur-xl flex flex-col shrink-0 overflow-hidden z-20"
            >
              <div className="w-[360px] h-full flex flex-col">
                <NowPlayingPanel onClose={toggleNowPlayingSidebar} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM FLOATING PLAYER */}
      <AnimatePresence>{currentSong && !showNowPlaying && <MiniPlayer />}</AnimatePresence>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />

      {/* Fullscreen Now Playing Overlay */}
      <AnimatePresence>{showNowPlaying && <NowPlayingOverlay />}</AnimatePresence>

      {/* Toast Alerts & Modals */}
      <ToastContainer />
      <UpdateModal />
      <WhatsNewModal />
    </div>
  );
}
