import { usePlayerStore, useFavoritesStore } from '@/stores';
import { formatTime, getImageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  ListMusic,
  Mic2,
  PanelRight,
  Maximize2,
  Timer,
  Heart,
} from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { SleepTimerModal } from './SleepTimerModal';

export function MiniPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    shuffleMode,
    sleepTimerOption,
    showLyrics,
    showNowPlayingSidebar,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    toggleQueue,
    toggleLyrics,
    toggleNowPlaying,
    toggleNowPlayingSidebar,
    setIsSeeking: setStoreIsSeeking,
    playNext,
    playPrevious,
  } = usePlayerStore();

  const { isFavoriteSong, toggleFavoriteSong } = useFavoritesStore();

  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);

  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [localTime, setLocalTime] = useState(0);

  useEffect(() => {
    if (!isSeeking) {
      setLocalTime(currentTime);
    }
  }, [currentTime, isSeeking]);

  useEffect(() => {
    setStoreIsSeeking(isSeeking);
  }, [isSeeking, setStoreIsSeeking]);

  const progress = duration > 0 ? (localTime / duration) * 100 : 0;

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    setIsSeeking(true);

    const applySeek = (seekTime: number) => {
      setCurrentTime(seekTime);
      window.dispatchEvent(new CustomEvent('player:seek', { detail: seekTime }));
    };

    const updateTimeFromEvent = (clientX: number) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const seekTime = percent * duration;
      setLocalTime(seekTime);
      applySeek(seekTime);
    };

    updateTimeFromEvent(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateTimeFromEvent(moveEvent.clientX);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsSeeking(false);

      if (progressRef.current) {
        const rect = progressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (upEvent.clientX - rect.left) / rect.width));
        const seekTime = percent * duration;
        applySeek(seekTime);
      }

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleVolumeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeRef.current) return;

    const updateVolumeFromEvent = (clientX: number) => {
      if (!volumeRef.current) return;
      const rect = volumeRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setVolume(percent);
      window.dispatchEvent(new CustomEvent('player:volume', { detail: percent }));
    };

    updateVolumeFromEvent(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateVolumeFromEvent(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  if (!currentSong) return null;

  const isStreaming = !currentSong.path && (currentSong.sourceType === 'streaming' || !!currentSong.ytVideoId);
  const coverSrc = currentSong.coverPath
    ? getImageUrl(currentSong.coverPath)
    : (currentSong.remoteCoverUrl || '/default-cover.png');
  const isFav = isFavoriteSong(currentSong.id);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="fixed bottom-3 left-4 right-4 max-w-[1400px] mx-auto h-[84px] bg-[#131313]/95 backdrop-blur-2xl border border-white/10 rounded-2xl flex flex-col shrink-0 z-50 shadow-2xl"
    >
      {/* Top Seekable Progress Bar */}
      <div
        ref={progressRef}
        onMouseDown={handleProgressMouseDown}
        className="relative w-full h-1 cursor-pointer group shrink-0 rounded-t-2xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/5" />
        <motion.div
          className="absolute left-0 top-0 h-full bg-[#0070F3]"
          style={{ width: `${progress}%` }}
          transition={isSeeking ? { duration: 0 } : { duration: 0.1 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#0070F3] rounded-full shadow-glow opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      {/* Control Bar Layout */}
      <div className="flex-1 flex items-center px-4 gap-3 md:gap-4">
        {/* Left: Song Metadata & Favorite Button */}
        <div className="flex items-center gap-2.5 w-[210px] lg:w-[250px] min-w-0 group shrink-0">
          <motion.img
            key={currentSong.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={coverSrc}
            alt={currentSong.album}
            referrerPolicy="no-referrer"
            onClick={toggleNowPlaying}
            className="w-11 h-11 rounded-lg object-cover shadow-md border border-white/5 cursor-pointer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-cover.png';
            }}
          />
          <div className="min-w-0 flex-1 cursor-pointer" onClick={toggleNowPlaying}>
            <p className="text-xs font-bold text-white group-hover:text-[#0070F3] transition-colors truncate">
              {currentSong.title}
            </p>
            <p className="text-[11px] text-[#9CA3AF] truncate mt-0.5">
              {currentSong.artist}
            </p>
            {isStreaming && (
              <span className="font-mono text-[9px] text-[#0070F3] font-semibold">
                ☁ Streaming
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavoriteSong(currentSong.id);
            }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer shrink-0 ${
              isFav ? 'text-[#0070F3]' : 'text-[#8B90A0] hover:text-white'
            }`}
            title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex-1 flex items-center justify-center gap-2 md:gap-3">
          <ControlButton onClick={toggleShuffle} active={shuffleMode === 'on'} size="sm">
            <Shuffle size={15} strokeWidth={1.8} />
          </ControlButton>

          <ControlButton onClick={playPrevious}>
            <SkipBack size={17} strokeWidth={1.8} />
          </ControlButton>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setIsPlaying(!isPlaying);
              window.dispatchEvent(new CustomEvent('player:toggle'));
            }}
            className="w-9 h-9 rounded-full bg-[#0070F3] flex items-center justify-center text-white shadow-glow hover:bg-[#1B82FF] transition-colors cursor-pointer"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isPlaying ? 'pause' : 'play'}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {isPlaying ? (
                  <Pause size={17} strokeWidth={2} fill="#FFF" className="text-white" />
                ) : (
                  <Play size={17} strokeWidth={2} fill="#FFF" className="text-white ml-0.5" />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          <ControlButton onClick={playNext}>
            <SkipForward size={17} strokeWidth={1.8} />
          </ControlButton>

          <ControlButton onClick={toggleRepeat} active={repeatMode !== 'off'} size="sm">
            {repeatMode === 'one' ? (
              <Repeat1 size={15} strokeWidth={1.8} />
            ) : (
              <Repeat size={15} strokeWidth={1.8} />
            )}
          </ControlButton>
        </div>

        {/* Right: Timestamps & Feature Toggles */}
        <div className="flex items-center gap-2 md:gap-2.5 min-w-0 justify-end shrink-0">
          <span className="font-mono text-[10px] text-[#8B90A0] tabular-nums hidden sm:inline">
            {formatTime(currentTime)}
          </span>
          <span className="font-mono text-[10px] text-[#8B90A0]/40 hidden sm:inline">/</span>
          <span className="font-mono text-[10px] text-[#8B90A0] tabular-nums hidden sm:inline">
            {formatTime(duration)}
          </span>

          <ControlButton onClick={toggleNowPlayingSidebar} active={showNowPlayingSidebar} size="sm">
            <PanelRight size={15} strokeWidth={1.8} />
          </ControlButton>

          <ControlButton onClick={toggleLyrics} active={showLyrics} size="sm">
            <Mic2 size={15} strokeWidth={1.8} />
          </ControlButton>

          <ControlButton onClick={toggleQueue} size="sm" title="Queue">
            <ListMusic size={15} strokeWidth={1.8} />
          </ControlButton>

          <div className="relative">
            <ControlButton
              onClick={() => setShowSleepTimerModal(!showSleepTimerModal)}
              active={sleepTimerOption !== 'off'}
              size="sm"
              title="Sleep Timer"
            >
              <Timer size={15} strokeWidth={1.8} />
            </ControlButton>

            <SleepTimerModal
              isOpen={showSleepTimerModal}
              onClose={() => setShowSleepTimerModal(false)}
              align="bottom-player"
            />
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleMute} className="text-[#8B90A0] hover:text-white transition-colors cursor-pointer">
              <VolumeIcon size={15} strokeWidth={1.8} />
            </button>
            <div
              ref={volumeRef}
              onMouseDown={handleVolumeMouseDown}
              className="relative w-20 shrink-0 h-1.5 bg-white/10 rounded-full cursor-pointer group"
            >
              <div
                className="absolute left-0 top-0 h-full bg-[#0070F3] rounded-full"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#0070F3] rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-glow"
                style={{ left: `calc(${(isMuted ? 0 : volume) * 100}% - 6px)` }}
              />
            </div>
          </div>

          <ControlButton onClick={toggleNowPlaying} size="sm" title="Fullscreen">
            <Maximize2 size={14} strokeWidth={1.8} />
          </ControlButton>
        </div>
      </div>
    </motion.div>
  );
}

interface ControlButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  size?: 'sm' | 'md';
  title?: string;
}

function ControlButton({ children, onClick, active = false, size = 'md', title }: ControlButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center rounded-full transition-colors duration-150 cursor-pointer ${
        size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'
      } ${
        active ? 'text-[#0070F3] bg-[#0070F3]/10 border border-[#0070F3]/30' : 'text-[#8B90A0] hover:text-white'
      } hover:bg-white/5`}
    >
      {children}
    </motion.button>
  );
}
