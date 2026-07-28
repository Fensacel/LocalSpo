import { useEffect, useState, useRef, useMemo } from 'react';
import { usePlayerStore, useSettingsStore, useFavoritesStore } from '@/stores';
import { X, SkipForward, Mic2, ExternalLink, Heart } from 'lucide-react';
import { getImageUrl } from '@/utils';
import { parseLyrics, findCurrentLyricIndex } from '@/services/lyricsParser';
import { RomanizationService } from '@/modules/romanization/RomanizationService';
import { LyricOffsetStore } from '@/services/lyricOffsetStore';
import { motion } from 'framer-motion';
import type { LyricsData } from '@/types';

interface NowPlayingPanelProps {
  onClose: () => void;
}

export function NowPlayingPanel({ onClose }: NowPlayingPanelProps) {
  const { currentSong, currentTime, queue, queueIndex, playNext } = usePlayerStore();
  const { lyricsDisplayMode, seekByLyricsEnabled } = useSettingsStore();
  const { isFavoriteSong, toggleFavoriteSong } = useFavoritesStore();

  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Load lyrics when song changes
  useEffect(() => {
    if (!currentSong) {
      setLyrics(null);
      return;
    }

    let cancelled = false;
    lineRefs.current.clear();

    const loadLyrics = async () => {
      setLyricsLoading(true);
      setLyrics(null);

      try {
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 15000)
        );

        const result = await Promise.race([
          window.electronAPI.lyrics.read(
            currentSong.id,
            currentSong.path,
            currentSong.lrcPath,
            currentSong.hasEmbeddedLyrics,
            currentSong.artist,
            currentSong.title,
            currentSong.album,
            currentSong.duration
          ),
          timeoutPromise,
        ]);

        if (cancelled) return;

        if (result && result.content) {
          const parsed = parseLyrics(result.content, currentSong.artist);
          setLyrics(parsed);
          RomanizationService.clearCache(currentSong.id);
          RomanizationService.processLyrics(parsed, currentSong.id, true).then((processed) => {
            if (!cancelled && processed) setLyrics(processed);
          });
        }
      } catch (err) {
        console.warn('[NowPlayingPanel] Failed to load lyrics:', err);
      } finally {
        if (!cancelled) setLyricsLoading(false);
      }
    };

    loadLyrics();

    return () => {
      cancelled = true;
    };
  }, [currentSong?.id]);

  // Find current lyric index taking per-song offset into account
  const offset = currentSong ? LyricOffsetStore.getOffset(currentSong.id) : 0;
  const currentIndex = useMemo(() => {
    if (!lyrics?.synced) return -1;
    return findCurrentLyricIndex(lyrics.lines, currentTime - offset);
  }, [lyrics, currentTime, offset]);

  // Auto-scroll active lyric line to ~35% from top (100% identical to LyricsView)
  useEffect(() => {
    if (currentIndex < 0 || !lyrics?.synced) return;

    const element = lineRefs.current.get(currentIndex);
    if (element && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const containerHeight = container.clientHeight;
      const elementTop = element.offsetTop;
      const scrollTarget = elementTop - containerHeight * 0.35;

      container.scrollTo({
        top: Math.max(0, scrollTarget),
        behavior: 'smooth',
      });
    }
  }, [currentIndex, lyrics?.synced]);

  const handleExpandLyrics = () => {
    usePlayerStore.getState().toggleLyrics();
  };

  if (!currentSong) return null;

  const coverSrc = currentSong.coverPath
    ? getImageUrl(currentSong.coverPath)
    : (currentSong.remoteCoverUrl || (currentSong as any).coverUrl || '/default-cover.png');

  // Next in queue
  const nextSong = queueIndex >= 0 && queueIndex < queue.length - 1 ? queue[queueIndex + 1] : null;
  const isFav = isFavoriteSong(currentSong.id);

  return (
    <div className="h-full flex flex-col bg-[#131313] text-[#E5E2E1] select-none border-l border-white/5">
      {/* Panel Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#8B90A0]">
          NOW PLAYING
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#8B90A0] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Panel Scroll Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin pb-28">
        {/* Large Artwork */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl bg-[#151518] border border-white/10 group">
          <img
            src={coverSrc}
            alt={currentSong.album}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-cover.png';
            }}
          />
        </div>

        {/* Title, Artist, & Audio Quality Spec Badge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white truncate hover:underline cursor-pointer flex-1">
              {currentSong.title}
            </h2>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleFavoriteSong(currentSong.id)}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isFav ? 'text-[#0070F3]' : 'text-[#8B90A0] hover:text-white'
                }`}
                title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
              </button>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-white">
                FLAC
              </span>
            </div>
          </div>

          <p className="text-xs text-[#9CA3AF] truncate hover:underline cursor-pointer">
            {currentSong.artist}
          </p>
        </div>

        {/* Syncing Lyrics Block (Synchronized to exact playing line) */}
        {!lyricsLoading && lyrics && (
          <div className="bg-[#151518] border border-white/5 hover:border-[#0070F3]/40 rounded-xl p-4 transition-all duration-200 group space-y-3">
            <div className="flex items-center justify-between text-[#8B90A0]">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Mic2 size={12} className="text-[#0070F3]" />
                LYRICS
              </span>
              <button
                onClick={handleExpandLyrics}
                className="font-mono text-[10px] text-[#0070F3] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Expand <ExternalLink size={10} />
              </button>
            </div>

            {/* Synced Lyrics Container */}
            {lyrics.synced ? (
              <div
                ref={lyricsContainerRef}
                className="relative max-h-[180px] overflow-y-auto space-y-3 scrollbar-none py-3 px-1 select-none"
              >
                {lyrics.lines.map((line, index) => {
                  const isActive = index === currentIndex;
                  const isPast = currentIndex >= 0 && index < currentIndex;
                  const mode = lyricsDisplayMode || 'both';

                  const displayText = mode === 'romanized'
                    ? (line.romanization || line.text)
                    : line.text;

                  const showSubRomanization = mode === 'both' && !!line.romanization;

                  return (
                    <div
                      key={`${line.time}-${index}`}
                      ref={(el) => {
                        if (el) lineRefs.current.set(index, el);
                      }}
                      className={`transition-all duration-300 transform origin-left space-y-1 py-0.5 ${
                        seekByLyricsEnabled ? 'cursor-pointer hover:opacity-100' : 'cursor-default'
                      }`}
                      onClick={() => {
                        if (seekByLyricsEnabled === false) return;
                        const targetTime = Math.max(0, line.time + offset);
                        usePlayerStore.getState().setCurrentTime(targetTime);
                        window.dispatchEvent(new CustomEvent('player:seek', { detail: targetTime }));
                      }}
                    >
                      {/* Primary Line */}
                      <motion.p
                        animate={{ opacity: isActive ? 1 : isPast ? 0.3 : 0.45 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className={`font-extrabold tracking-tight leading-relaxed transition-colors ${
                          isActive
                            ? 'text-white text-sm font-bold drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]'
                            : 'text-[#8B90A0] text-xs font-semibold'
                        }`}
                      >
                        {displayText || '♪'}
                      </motion.p>

                      {/* Sub Romanization Line (Both mode) */}
                      {showSubRomanization && (
                        <motion.p
                          animate={{ opacity: isActive ? 0.85 : isPast ? 0.25 : 0.35 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className={`font-medium tracking-wide leading-relaxed ${
                            isActive ? 'text-xs text-white/80' : 'text-[11px] text-[#8B90A0]/60'
                          }`}
                        >
                          {line.romanization}
                        </motion.p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Unsynced Lyrics */
              <div className="max-h-[160px] overflow-y-auto space-y-2 scrollbar-none text-left">
                {lyrics.lines.map((line, index) => (
                  <p key={index} className="text-xs font-medium text-[#8B90A0] leading-relaxed">
                    {line.text || <>&nbsp;</>}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Artist Credits Block */}
        <div className="bg-[#151518] border border-white/5 rounded-xl p-4 space-y-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8B90A0] block">
            ARTIST CREDITS
          </span>
          <div>
            <p className="text-xs font-bold text-white">
              Produced by Carbon-14
            </p>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              Primary Artist: {currentSong.artist}
            </p>
          </div>
        </div>

        {/* Next in Queue Card */}
        {nextSong && (
          <div className="bg-[#151518] border border-white/5 rounded-xl p-4 space-y-3">
            <span className="font-mono text-[10px] font-bold text-[#8B90A0] uppercase tracking-wider block">
              NEXT UP IN QUEUE
            </span>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={nextSong.coverPath ? getImageUrl(nextSong.coverPath) : (nextSong.remoteCoverUrl || (nextSong as any).coverUrl || '/default-cover.png')}
                  alt={nextSong.title}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-lg object-cover bg-[#0B0B0D]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-cover.png';
                  }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {nextSong.title}
                  </p>
                  <p className="text-[10px] font-mono text-[#8B90A0] truncate mt-0.5">
                    {nextSong.artist}
                  </p>
                </div>
              </div>
              <button
                onClick={playNext}
                className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                title="Skip Next"
              >
                <SkipForward size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
