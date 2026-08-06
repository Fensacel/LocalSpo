import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Music, Mic2, Disc3, ListMusic, User, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibraryStore, usePlayerStore, usePlaylistStore } from '@/stores';
import { useProfileStore } from '@/stores/useProfileStore';
import { useSpotifyStore } from '@/modules/downloader/stores/useSpotifyStore';
import { useStreamingStore } from '@/stores/useStreamingStore';
import { SafeAvatar, SafeImage } from '@/components/SafeImage';
import { createStreamSong } from '@/types/music';
import type { Song } from '@/types';

export function UniversalSearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { setSearchQuery, search, searchResults } = useSpotifyStore();
  const { songs: localSongs, albums: localAlbums, artists: localArtists, addStreamSong } = useLibraryStore();
  const { playlists } = usePlaylistStore();
  const { knownUsers, profile } = useProfileStore();
  const { setQueue, setIsPlaying } = usePlayerStore();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSearchQuery(val);
    setIsOpen(!!val.trim());
    if (val.trim().length > 1) {
      search(val.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const q = query.toLowerCase().trim();

  // Local song matches
  const matchedLocalSongs = q
    ? localSongs.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q),
      )
    : [];

  // Online track matches
  const onlineTracks = searchResults?.tracks || [];

  // Combined Songs (Local + Online)
  const matchedSongs: Song[] = q
    ? [
        ...matchedLocalSongs,
        ...onlineTracks.map((t: any, idx: number) => {
          const trackId = t.ytVideoId || t.id || `${q}_${idx}`;
          const s = createStreamSong({
            id: `stream_${trackId}`,
            title: t.title || t.name || 'Unknown Track',
            artist: t.artist || t.artistNames?.join(', ') || 'Unknown Artist',
            album: t.album || 'Single',
            duration: t.durationMs ? t.durationMs / 1000 : 180,
            coverUrl: t.coverUrl || undefined,
            ytVideoId: t.ytVideoId || '',
          });
          return s;
        }),
      ].slice(0, 5)
    : [];

  // Local & Online Artist matches
  const onlineArtists = searchResults?.artists || [];
  const matchedArtists = q
    ? [
        ...localArtists.filter((a) => a.name.toLowerCase().includes(q)).map((a) => ({ id: a.id, name: a.name, coverPath: a.coverPath })),
        ...onlineArtists.map((a: any) => ({ id: a.id || a.name, name: a.name, coverPath: a.coverUrl })),
      ].slice(0, 3)
    : [];

  // Local & Online Album matches
  const onlineAlbums = searchResults?.albums || [];
  const matchedAlbums = q
    ? [
        ...localAlbums.filter((a) => a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)).map((a) => ({ id: a.id, name: a.name, artist: a.artist, coverPath: a.coverPath })),
        ...onlineAlbums.map((a: any) => ({ id: a.spotifyId || a.id || a.title, name: a.title || a.name, artist: a.artist, coverPath: a.coverUrl })),
      ].slice(0, 3)
    : [];

  // Playlist matches
  const matchedPlaylists = q
    ? playlists.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)).slice(0, 3)
    : [];

  // User matches
  const matchedUsers = q
    ? [
        ...(profile && (profile.username.toLowerCase().includes(q) || profile.displayName.toLowerCase().includes(q)) ? [profile] : []),
        ...knownUsers.filter((u) => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)),
      ].slice(0, 3)
    : [];

  const hasAnyResults =
    matchedSongs.length > 0 ||
    matchedArtists.length > 0 ||
    matchedAlbums.length > 0 ||
    matchedPlaylists.length > 0 ||
    matchedUsers.length > 0;

  const handlePlaySong = (song: Song) => {
    if (song.sourceType === 'streaming') {
      addStreamSong(song);
      useStreamingStore.getState().resolveStreamUrl(song, true).catch(() => {});
    }
    setQueue([song], 0, 'Search Results');
    setIsPlaying(true);
    window.dispatchEvent(new CustomEvent('player:play'));
    setIsOpen(false);
  };

  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <div ref={ref} className="relative w-72 lg:w-96" style={noDragStyle}>
      {/* Input Field */}
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-[#8B90A0] pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.trim() && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search songs, artists, albums, playlists..."
          className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-[#0070F3] text-xs text-white placeholder:text-[#8B90A0] rounded-full pl-8 pr-8 py-1.5 transition-all outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 text-[#8B90A0] hover:text-white transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Floating Results Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 bg-[#121215]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[300] max-h-[480px] overflow-y-auto scrollbar-thin"
          >
            <div className="px-3 pt-3 pb-1 border-b border-white/5">
              <span className="font-mono text-[10px] font-bold text-[#8B90A0] uppercase tracking-wider">
                MATCHES FOR &quot;{query.toUpperCase()}&quot;
              </span>
            </div>

            {!hasAnyResults ? (
              <div className="p-4 text-center text-xs text-[#8B90A0]">
                No matching results found for &quot;{query}&quot;
              </div>
            ) : (
              <div className="py-2 space-y-3">
                {/* Songs Section */}
                {matchedSongs.length > 0 && (
                  <div>
                    <div className="px-3 py-1 font-mono text-[10px] font-bold text-[#8B90A0] uppercase flex items-center gap-1.5">
                      <Music size={11} className="text-[#0070F3]" /> Songs
                    </div>
                    {matchedSongs.map((song) => (
                      <div
                        key={song.id}
                        onClick={() => handlePlaySong(song)}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 overflow-hidden shrink-0 border border-white/5">
                          <SafeImage src={song.coverPath} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white group-hover:text-[#0070F3] truncate">
                            {song.title}
                          </p>
                          <p className="text-[10px] font-mono text-[#8B90A0] truncate">{song.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Artists Section */}
                {matchedArtists.length > 0 && (
                  <div>
                    <div className="px-3 py-1 font-mono text-[10px] font-bold text-[#8B90A0] uppercase flex items-center gap-1.5">
                      <Mic2 size={11} className="text-purple-400" /> Artists
                    </div>
                    {matchedArtists.map((artist) => (
                      <div
                        key={artist.id}
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/artists/${encodeURIComponent(artist.id)}`);
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
                          <SafeAvatar src={artist.coverPath} alt={artist.name} sizeClassName="w-full h-full" />
                        </div>
                        <p className="text-xs font-bold text-white group-hover:text-purple-400 truncate">
                          {artist.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Albums Section */}
                {matchedAlbums.length > 0 && (
                  <div>
                    <div className="px-3 py-1 font-mono text-[10px] font-bold text-[#8B90A0] uppercase flex items-center gap-1.5">
                      <Disc3 size={11} className="text-amber-400" /> Albums
                    </div>
                    {matchedAlbums.map((album) => (
                      <div
                        key={album.id}
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/albums/${encodeURIComponent(album.id)}`);
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 overflow-hidden shrink-0 border border-white/5">
                          <SafeImage src={album.coverPath} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white group-hover:text-amber-400 truncate">
                            {album.name}
                          </p>
                          <p className="text-[10px] font-mono text-[#8B90A0] truncate">{album.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Playlists Section */}
                {matchedPlaylists.length > 0 && (
                  <div>
                    <div className="px-3 py-1 font-mono text-[10px] font-bold text-[#8B90A0] uppercase flex items-center gap-1.5">
                      <ListMusic size={11} className="text-emerald-400" /> Playlists
                    </div>
                    {matchedPlaylists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/playlists/${pl.id}`);
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 overflow-hidden shrink-0 flex items-center justify-center border border-white/5">
                          <SafeImage src={pl.coverPath} alt="" className="w-full h-full object-cover" fallback={<ListMusic size={12} className="text-[#8B90A0]" />} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white group-hover:text-emerald-400 truncate">
                            {pl.name}
                          </p>
                          <p className="text-[10px] font-mono text-[#8B90A0] truncate">{pl.songIds.length} tracks</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Users Section */}
                {matchedUsers.length > 0 && (
                  <div>
                    <div className="px-3 py-1 font-mono text-[10px] font-bold text-[#8B90A0] uppercase flex items-center gap-1.5">
                      <User size={11} className="text-cyan-400" /> Users
                    </div>
                    {matchedUsers.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/profile/${u.username}`);
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                          <SafeAvatar src={u.avatarUrl} alt="" sizeClassName="w-full h-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white group-hover:text-cyan-400 truncate">
                            {u.displayName}
                          </p>
                          <p className="text-[10px] font-mono text-[#8B90A0] truncate">@{u.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* See All Button */}
                <div className="border-t border-white/5 pt-1.5 px-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-[#0070F3] text-xs font-semibold text-white transition-all cursor-pointer group"
                  >
                    <span>See all results for &quot;{query}&quot;</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
