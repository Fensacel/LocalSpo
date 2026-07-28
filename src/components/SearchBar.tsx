import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpotifyStore } from '@/modules/downloader/stores/useSpotifyStore';
import { usePlayerStore, useLibraryStore } from '@/stores';
import { createStreamSong } from '@/types/music';
import type { Song } from '@/types';
import { SongContextMenu } from '@/components/SongContextMenu';

interface RecentSearchItem {
  id: string;
  title: string;
  subtitle: string;
  coverUrl?: string;
  type: 'song' | 'artist' | 'query' | 'album';
  ytVideoId?: string;
}

export function SearchBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [contextMenu, setContextMenu] = useState<{ song: Song; x: number; y: number } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { searchQuery, setSearchQuery, search, searchResults } = useSpotifyStore();
  const { setQueue } = usePlayerStore();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load recent search history from localStorage
  const loadRecentSearches = () => {
    try {
      const raw = localStorage.getItem('localspo_recent_search_items');
      if (raw) {
        setRecentSearches(JSON.parse(raw));
      } else {
        setRecentSearches([
          { id: '1', title: 'Hearts2Hearts', subtitle: 'Artist', type: 'artist' },
          { id: '2', title: 'TWICE', subtitle: 'Artist', type: 'artist' },
          { id: '3', title: 'STYLE', subtitle: 'Song • Hearts2Hearts', type: 'song' },
        ]);
      }
    } catch {}
  };

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const addRecentSearch = (item: RecentSearchItem) => {
    try {
      const existing = recentSearches.filter((i) => i.id !== item.id && i.title.toLowerCase() !== item.title.toLowerCase());
      const updated = [item, ...existing].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('localspo_recent_search_items', JSON.stringify(updated));
    } catch {}
  };

  const removeRecentSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((i) => i.id !== id);
      setRecentSearches(updated);
      localStorage.setItem('localspo_recent_search_items', JSON.stringify(updated));
    } catch {}
  };

  const clearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('localspo_recent_search_items');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsDropdownOpen(true);
        if (location.pathname !== '/search') navigate('/search');
      }
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setIsDropdownOpen(true);
    if (val.trim()) {
      search(val.trim());
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addRecentSearch({
        id: `query_${Date.now()}`,
        title: searchQuery.trim(),
        subtitle: 'Search Query',
        type: 'query',
      });
      search(searchQuery.trim());
      setIsDropdownOpen(false);
      usePlayerStore.setState({ showLyrics: false, showNowPlaying: false });
      navigate('/search');
    }
  };

  return (
    <div className="relative flex-1 max-w-md" ref={searchContainerRef}>
      <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
        <Search size={15} className="absolute left-3.5 text-[#8B90A0] pointer-events-none z-10" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onClick={() => setIsDropdownOpen(true)}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder="Search tracks, artists, or albums..."
          className="w-full h-9 pl-9 pr-16 bg-[#151518] border border-white/10 rounded-lg text-xs font-medium text-white placeholder:text-[#8B90A0] focus:outline-none focus:border-[#0070F3] focus:bg-[#1a1a1e] transition-all cursor-text"
        />

        <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none z-10">
          <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono text-[#8B90A0] border border-white/5">
            Ctrl L
          </span>
        </div>
      </form>

      {/* Dropdown Search Popover */}
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute top-11 left-0 right-0 bg-[#151518] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-2 max-h-[400px] flex flex-col"
          >
            {!searchQuery.trim() ? (
              <div>
                <div className="flex items-center justify-between px-3 py-1.5 mb-1">
                  <span className="font-mono text-[10px] font-bold text-[#8B90A0] uppercase tracking-wider">
                    Recent Searches
                  </span>
                  {recentSearches.length > 0 && (
                    <button
                      onClick={clearAllRecent}
                      className="text-[10px] font-mono text-[#8B90A0] hover:text-white transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {recentSearches.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-[#8B90A0]">
                    No recent searches
                  </div>
                ) : (
                  <div className="space-y-0.5 overflow-y-auto max-h-[320px] scrollbar-thin">
                    {recentSearches.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          usePlayerStore.setState({ showLyrics: false, showNowPlaying: false });
                          setIsDropdownOpen(false);
                          if (item.type === 'song') {
                            const artistName = item.subtitle?.replace(/^Song • /, '') || 'Unknown';
                            const songObj = createStreamSong({
                              id: item.id.startsWith('stream_') ? item.id : `stream_${item.id}`,
                              title: item.title,
                              artist: artistName,
                              album: '',
                              duration: 0,
                              coverUrl: item.coverUrl || undefined,
                              ytVideoId: item.ytVideoId || '',
                            });
                            useLibraryStore.getState().addStreamSong(songObj);
                            setQueue([songObj], 0, 'Recent Search');
                            usePlayerStore.setState({ currentSong: songObj, isPlaying: true });
                            window.dispatchEvent(new CustomEvent('player:play'));
                          } else {
                            setSearchQuery(item.title);
                            search(item.title);
                            navigate('/search');
                          }
                        }}
                        onContextMenu={(e) => {
                          if (item.type !== 'song') return;
                          e.preventDefault();
                          e.stopPropagation();
                          const artistName = item.subtitle?.replace(/^Song • /, '') || 'Unknown';
                          const songObj = createStreamSong({
                            id: item.id.startsWith('stream_') ? item.id : `stream_${item.id}`,
                            title: item.title,
                            artist: artistName,
                            album: '',
                            duration: 0,
                            coverUrl: item.coverUrl || undefined,
                            ytVideoId: item.ytVideoId || '',
                          });
                          setContextMenu({ song: songObj, x: e.clientX, y: e.clientY });
                        }}
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Clock size={13} className="text-[#8B90A0] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate group-hover:text-[#0070F3] transition-colors">
                              {item.title}
                            </p>
                            <p className="text-[10px] font-mono text-[#8B90A0] truncate">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => removeRecentSearch(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#8B90A0] hover:text-white transition-all cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[340px] space-y-1 scrollbar-thin">
                <div className="px-3 pt-1 font-mono text-[10px] font-bold text-[#8B90A0] uppercase tracking-wider">
                  Matches for &quot;{searchQuery}&quot;
                </div>

                {searchResults?.tracks && searchResults.tracks.length > 0 ? (
                  <div className="space-y-0.5">
                    {searchResults.tracks.slice(0, 5).map((track: any) => (
                      <div
                        key={track.id || track.spotifyId}
                        onClick={() => {
                          const trackId = track.id || track.spotifyId || '';
                          const cover = track.album?.images?.[0]?.url || track.coverUrl || null;
                          const artistStr = track.artists?.map((a: any) => a.name).join(', ') || track.artist || 'Unknown';
                          
                          addRecentSearch({
                            id: trackId,
                            title: track.name || track.title,
                            subtitle: `Song • ${artistStr}`,
                            coverUrl: cover || undefined,
                            type: 'song',
                            ytVideoId: track.ytVideoId || '',
                          });

                          const songObj = createStreamSong({
                            id: trackId.startsWith('stream_') ? trackId : `stream_${trackId}`,
                            title: track.name || track.title,
                            artist: artistStr,
                            album: track.album?.name || track.album || '',
                            duration: track.durationMs ? Math.round(track.durationMs / 1000) : 0,
                            coverUrl: cover || undefined,
                            ytVideoId: track.ytVideoId || '',
                          });

                          useLibraryStore.getState().addStreamSong(songObj);
                          setQueue([songObj], 0, 'Search Preview');
                          usePlayerStore.setState({ currentSong: songObj, isPlaying: true, showLyrics: false, showNowPlaying: false });
                          window.dispatchEvent(new CustomEvent('player:play'));

                          setIsDropdownOpen(false);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const trackId = track.id || track.spotifyId || '';
                          const cover = track.album?.images?.[0]?.url || track.coverUrl || null;
                          const artistStr = track.artists?.map((a: any) => a.name).join(', ') || track.artist || 'Unknown';
                          const songObj = createStreamSong({
                            id: trackId.startsWith('stream_') ? trackId : `stream_${trackId}`,
                            title: track.name || track.title,
                            artist: artistStr,
                            album: track.album?.name || track.album || '',
                            duration: track.durationMs ? Math.round(track.durationMs / 1000) : 0,
                            coverUrl: cover || undefined,
                            ytVideoId: track.ytVideoId || '',
                          });
                          setContextMenu({ song: songObj, x: e.clientX, y: e.clientY });
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                      >
                        <img
                          src={track.album?.images?.[0]?.url || track.coverUrl || 'logo.png'}
                          className="w-8 h-8 object-cover rounded-md"
                          alt=""
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate group-hover:text-[#0070F3] transition-colors">
                            {track.name || track.title}
                          </p>
                          <p className="text-[10px] font-mono text-[#8B90A0] truncate">
                            {track.artists?.map((a: any) => a.name).join(', ') || track.artist}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-center text-xs text-[#8B90A0]">
                    Searching...
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {contextMenu && (
        <SongContextMenu
          song={contextMenu.song}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
