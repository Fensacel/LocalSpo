import { useLibraryStore, usePlayerStore, useFavoritesStore } from '@/stores';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Music, Clock, Heart, Check, List } from 'lucide-react';
import { formatTime, getImageUrl } from '@/utils';
import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import type { Song } from '@/types';
import { OverflowMarqueeText } from '@/components/OverflowMarqueeText';
import { SongContextMenu } from '@/components/SongContextMenu';
import { EditSongModal } from '@/components/EditSongModal';
import { SongDetailsModal } from '@/components/SongDetailsModal';

export function SongsPage() {
  const { songs } = useLibraryStore();
  const { currentSong, isPlaying, setQueue, setIsPlaying } = usePlayerStore();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [titleColumnWidth, setTitleColumnWidth] = useState(360);
  const [isResizingTitleColumn, setIsResizingTitleColumn] = useState(false);

  const [sortBy, setSortBy] = useState<'custom' | 'title' | 'artist' | 'album' | 'added' | 'duration'>('custom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSortChange = (newSortBy: 'custom' | 'title' | 'artist' | 'album' | 'added' | 'duration') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const sortedSongs = useMemo(() => {
    const list = [...songs];
    if (sortBy === 'custom') {
      if (sortOrder === 'desc') {
        list.reverse();
      }
      return list;
    }
    list.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'artist') {
        return a.artist.localeCompare(b.artist);
      } else if (sortBy === 'album') {
        return (a.album || '').localeCompare(b.album || '');
      } else if (sortBy === 'added') {
        return (a.addedAt || 0) - (b.addedAt || 0);
      } else if (sortBy === 'duration') {
        return a.duration - b.duration;
      }
      return 0;
    });

    if (sortOrder === 'desc') {
      list.reverse();
    }
    return list;
  }, [songs, sortBy, sortOrder]);

  const handlePlay = useCallback(
    (song: Song) => {
      if (currentSong?.id === song.id) {
        setIsPlaying(!isPlaying);
        window.dispatchEvent(new CustomEvent('player:toggle'));
      } else {
        let index = sortedSongs.findIndex((s) => s.id === song.id);
        if (index < 0) {
          index = sortedSongs.findIndex((s) => s.path === song.path);
        }
        if (index < 0) {
          index = 0;
        }
        setQueue(sortedSongs, index, 'Songs');
      }
    },
    [currentSong, isPlaying, sortedSongs, setQueue, setIsPlaying],
  );

  useEffect(() => {
    if (!isResizingTitleColumn) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!listRef.current) return;
      const rect = listRef.current.getBoundingClientRect();
      const fixedColumnsWidth = 40 + 40 + 80;
      const totalGapWidth = 16 * 4;
      const availableWidth = rect.width - fixedColumnsWidth - totalGapWidth;
      const minTitleWidth = 220;
      const minAlbumWidth = 160;
      const maxTitleWidth = Math.max(minTitleWidth, availableWidth - minAlbumWidth);
      const nextTitleWidth = event.clientX - rect.left - (40 + 16);
      const clampedWidth = Math.min(Math.max(nextTitleWidth, minTitleWidth), maxTitleWidth);
      setTitleColumnWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizingTitleColumn(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTitleColumn]);

  const gridTemplateColumns = useMemo(
    () => `40px minmax(220px, ${titleColumnWidth}px) minmax(160px, 1fr) 40px 80px`,
    [titleColumnWidth],
  );

  const getSortLabel = (val: string) => {
    switch (val) {
      case 'title': return 'Title';
      case 'artist': return 'Artist';
      case 'album': return 'Album';
      case 'added': return 'Recently added';
      case 'duration': return 'Duration';
      default: return 'Custom order';
    }
  };

  return (
    <div ref={listRef} className="select-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-mono uppercase tracking-tight">Library Songs</h1>
          <p className="text-xs font-mono text-[#8B90A0] mt-1">
            {songs.length} song{songs.length !== 1 ? 's' : ''} in local library
          </p>
        </div>
        <div className="flex items-center gap-3">
          {songs.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#151518] text-xs font-mono font-bold hover:bg-[#1C1B1B] transition-all text-[#8B90A0] hover:text-white border border-white/5 cursor-pointer"
              >
                <span>{getSortLabel(sortBy)}</span>
                <List size={14} />
              </button>

              <AnimatePresence>
                {showSortDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 mt-1.5 w-44 bg-[#151518] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 text-xs font-mono text-[#8B90A0]"
                  >
                    <div className="px-3 py-1.5 text-[9px] uppercase font-bold text-[#8B90A0]/50 tracking-wider">
                      SORT BY
                    </div>
                    {[
                      { value: 'custom', label: 'Custom order' },
                      { value: 'title', label: 'Title' },
                      { value: 'artist', label: 'Artist' },
                      { value: 'album', label: 'Album' },
                      { value: 'added', label: 'Recently added' },
                      { value: 'duration', label: 'Duration' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          handleSortChange(opt.value as any);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          sortBy === opt.value
                            ? 'text-[#0070F3] font-bold bg-white/5'
                            : 'text-[#8B90A0] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>
                          {opt.label}
                          {sortBy === opt.value && (
                            <span className="ml-1 opacity-60">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </span>
                        {sortBy === opt.value && <Check size={14} className="text-[#0070F3]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {songs.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setQueue(sortedSongs, 0, 'Songs')}
              className="flex items-center gap-2 px-4 py-2 bg-[#0070F3] hover:bg-[#1B82FF] text-white text-xs font-mono font-bold uppercase rounded-md shadow-glow transition-all cursor-pointer"
            >
              <Play size={14} fill="currentColor" />
              PLAY ALL
            </motion.button>
          )}
        </div>
      </div>

      {/* Column headers */}
      {songs.length > 0 && (
        <div
          className="grid gap-4 px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#8B90A0] font-bold border-b border-white/5 mb-1 select-none"
          style={{ gridTemplateColumns }}
        >
          <span>#</span>
          <div className="relative flex items-center">
            <span
              onClick={() => handleSortChange('title')}
              className="cursor-pointer hover:text-white transition-colors flex items-center gap-1 select-none"
            >
              TITLE {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
            </span>
            <button
              aria-label="Resize title column"
              onMouseDown={(event) => {
                event.preventDefault();
                setIsResizingTitleColumn(true);
              }}
              className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-2 cursor-col-resize"
            >
              <span className="block mx-auto h-4 w-px bg-white/15 hover:bg-[#0070F3] transition-colors" />
            </button>
          </div>
          <span
            onClick={() => handleSortChange('album')}
            className="cursor-pointer hover:text-white transition-colors flex items-center gap-1 select-none w-fit"
          >
            ALBUM {sortBy === 'album' && (sortOrder === 'asc' ? '↑' : '↓')}
          </span>
          <span className="text-center flex items-center justify-center">
            <Heart size={11} />
          </span>
          <span className="text-right flex items-center justify-end gap-1">
            <Clock size={11} />
            TIME
          </span>
        </div>
      )}

      {/* Song list */}
      <div className="space-y-1">
        {sortedSongs.map((song, index) => (
          <SongRow
            key={song.id}
            song={song}
            index={index + 1}
            gridTemplateColumns={gridTemplateColumns}
            isActive={currentSong?.id === song.id}
            isPlaying={currentSong?.id === song.id && isPlaying}
            onPlay={() => handlePlay(song)}
          />
        ))}
      </div>

      {songs.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
          <div className="w-20 h-20 bg-[#151518] border border-white/10 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Music size={32} className="text-[#8B90A0]/30" />
          </div>
          <p className="text-[#8B90A0] font-mono text-xs font-bold">No songs in your library</p>
          <p className="text-[#8B90A0]/50 font-mono text-[11px] mt-1">Add a music folder from the sidebar</p>
        </div>
      )}
    </div>
  );
}

interface SongRowProps {
  song: Song;
  index: number;
  gridTemplateColumns: string;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}

function SongRow({ song, index, gridTemplateColumns, isActive, isPlaying, onPlay }: SongRowProps) {
  const coverSrc = song.coverPath ? getImageUrl(song.coverPath) : null;
  const { isFavoriteSong, toggleFavoriteSong } = useFavoritesStore();
  const isFav = isFavoriteSong(song.id);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [viewingDetailsSong, setViewingDetailsSong] = useState<Song | null>(null);

  const handleSongClick = () => {
    onPlay();
  };

  return (
    <motion.div
      whileTap={{ scale: 0.995 }}
      onDoubleClick={handleSongClick}
      onContextMenu={(event) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY });
      }}
      className={`group grid gap-4 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
        isActive
          ? 'bg-[#0070F3]/15 border-l-2 border-[#0070F3]'
          : 'bg-[#151518] hover:bg-[#1C1B1B] border-l-2 border-transparent'
      }`}
      style={{ gridTemplateColumns }}
    >
      {/* Track number / play button */}
      <div className="flex items-center justify-center font-mono">
        <span
          className={`text-xs tabular-nums group-hover:hidden ${
            isActive ? 'text-[#0070F3] font-bold' : 'text-[#8B90A0]'
          }`}
        >
          {isActive && isPlaying ? (
            <div className="flex gap-0.5 items-end h-3.5">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-[#0070F3] rounded-full"
                  animate={{ height: ['20%', '100%', '20%'] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </div>
          ) : (
            index
          )}
        </span>
        <button
          onClick={handleSongClick}
          className="hidden group-hover:flex items-center justify-center text-white cursor-pointer"
        >
          {isActive && isPlaying ? (
            <Pause size={14} fill="currentColor" className="text-[#0070F3]" />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
        </button>
      </div>

      {/* Title + Artist */}
      <div className="flex items-center gap-3 min-w-0">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt=""
            className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/5"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-cover.png';
            }}
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-[#8B90A0]">
            <Music size={14} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <OverflowMarqueeText
              text={song.title}
              className={`text-xs font-bold flex-1 ${isActive ? 'text-[#0070F3]' : 'text-white'}`}
            />
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#8B90A0] uppercase font-bold shrink-0">
              {song.codec || 'MP3'}
            </span>
          </div>
          <OverflowMarqueeText text={song.artist} className="text-[11px] font-mono text-[#8B90A0]" />
        </div>
      </div>

      {/* Album */}
      <div className="flex items-center">
        <OverflowMarqueeText text={song.album || 'Single'} className="text-xs font-mono text-[#8B90A0] w-full" />
      </div>

      {/* Favorite toggler */}
      <div className="flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavoriteSong(song.id);
          }}
          className={`hover:scale-110 transition-transform cursor-pointer ${
            isFav
              ? 'text-[#0070F3]'
              : 'text-[#8B90A0]/40 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Duration */}
      <div className="flex items-center justify-end">
        <span className="text-xs text-[#8B90A0] tabular-nums font-mono">
          {formatTime(song.duration)}
        </span>
      </div>

      {contextMenu && (
        <SongContextMenu
          song={song}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEditSong={() => setEditingSong(song)}
          onViewDetails={() => setViewingDetailsSong(song)}
        />
      )}

      <EditSongModal
        song={editingSong}
        isOpen={!!editingSong}
        onClose={() => setEditingSong(null)}
      />

      <SongDetailsModal
        song={viewingDetailsSong}
        isOpen={!!viewingDetailsSong}
        onClose={() => setViewingDetailsSong(null)}
      />
    </motion.div>
  );
}
