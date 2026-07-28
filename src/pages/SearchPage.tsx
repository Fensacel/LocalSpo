import { useState } from 'react';
import { useLibraryStore, usePlayerStore, useToastStore, useStreamingStore } from '@/stores';
import { useSpotifyStore } from '@/modules/downloader/stores/useSpotifyStore';
import { useDownloaderStore } from '@/modules/downloader/stores/useDownloaderStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search as SearchIcon,
  Music,
  Disc3,
  Mic2,
  Play,
  Download,
  Radio,
  Loader2,
  HardDrive,
  ListPlus,
} from 'lucide-react';

import { formatTime, getImageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { createStreamSong } from '@/types/music';
import type { SpotifySearchTrack } from '@/modules/downloader/types';
import { SongContextMenu } from '@/components/SongContextMenu';
import type { Song } from '@/types';
import { SearchBar } from '@/components/SearchBar';

export function SearchPage() {
  const { searchQuery, searchResults, isSearching } = useSpotifyStore();
  const { songs: localSongs, albums: localAlbums, artists: localArtists } = useLibraryStore();
  const { setQueue, currentSong } = usePlayerStore();
  const { downloadUrl } = useDownloaderStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'local'>('all');
  const [contextMenu, setContextMenu] = useState<{ song: Song; x: number; y: number } | null>(null);

  const q = searchQuery.toLowerCase().trim();

  // Local filtering
  const matchingLocalSongs = q
    ? localSongs.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q) ||
          s.genre.toLowerCase().includes(q),
      )
    : [];

  const matchingLocalAlbums = q
    ? localAlbums.filter((a) => a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)).slice(0, 8)
    : [];

  const matchingLocalArtists = q
    ? localArtists.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 6)
    : [];

  const onlineTracks = searchResults?.tracks || [];
  const onlineAlbums = searchResults?.albums || [];
  const onlineArtists = searchResults?.artists || [];

  const handlePlayStream = (track: SpotifySearchTrack) => {
    const trackId = track.ytVideoId || track.id;
    if (!trackId) return;

    const allStreamSongs = onlineTracks.map((t) => {
      const idKey = t.ytVideoId || t.id;
      const s = createStreamSong({
        id: `stream_${idKey}`,
        title: t.title,
        artist: t.artist,
        album: t.album || 'Single',
        duration: t.durationMs ? t.durationMs / 1000 : 0,
        coverUrl: t.coverUrl || (t.ytVideoId ? `https://i.ytimg.com/vi/${t.ytVideoId}/hqdefault.jpg` : undefined),
        ytVideoId: t.ytVideoId || '',
      });

      useLibraryStore.getState().addStreamSong(s);
      return s;
    });

    const idx = onlineTracks.findIndex((t) => (t.ytVideoId || t.id) === trackId);
    const selectedSong = allStreamSongs[idx >= 0 ? idx : 0];
    if (selectedSong) {
      useStreamingStore.getState().resolveStreamUrl(selectedSong, true).catch(() => {});
    }
    setQueue(allStreamSongs, idx >= 0 ? idx : 0, 'Online Search Streaming');
    usePlayerStore.getState().setIsPlaying(true);
    window.dispatchEvent(new CustomEvent('player:play'));
    showToast(`Streaming: ${track.artist} — ${track.title}`, 'info');
  };

  const handleAddToQueueStream = (track: SpotifySearchTrack) => {
    const trackId = track.ytVideoId || track.id;
    if (!trackId) return;
    const streamSong = createStreamSong({
      id: `stream_${trackId}`,
      title: track.title,
      artist: track.artist,
      album: track.album || 'Single',
      duration: track.durationMs ? track.durationMs / 1000 : 0,
      coverUrl: track.coverUrl || undefined,
      ytVideoId: track.ytVideoId || '',
    });
    useLibraryStore.getState().addStreamSong(streamSong);
    usePlayerStore.getState().addToQueue(streamSong);
    showToast(`Added "${track.title}" to queue`, 'info');
  };

  const handleDownload = async (url: string, title: string) => {
    const ok = await downloadUrl(url);
    if (ok) showToast(`Added to download queue: ${title}`, 'success');
  };

  const hasAnyResults =
    matchingLocalSongs.length > 0 ||
    matchingLocalAlbums.length > 0 ||
    matchingLocalArtists.length > 0 ||
    onlineTracks.length > 0 ||
    onlineAlbums.length > 0 ||
    onlineArtists.length > 0;

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header Search Bar & Category Filter Chips */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SearchBar />

        {searchQuery.trim() && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-[#0070F3] text-white shadow-glow'
                  : 'bg-[#151518] text-[#8B90A0] hover:text-white border border-white/5'
              }`}
            >
              ALL RESULTS
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                activeTab === 'online'
                  ? 'bg-[#0070F3] text-white shadow-glow'
                  : 'bg-[#151518] text-[#0070F3] hover:text-white border border-[#0070F3]/30'
              }`}
            >
              <Radio size={13} />
              ONLINE STREAM ({onlineTracks.length})
            </button>
            <button
              onClick={() => setActiveTab('local')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                activeTab === 'local'
                  ? 'bg-[#0070F3] text-white shadow-glow'
                  : 'bg-[#151518] text-emerald-400 hover:text-white border border-emerald-500/30'
              }`}
            >
              <HardDrive size={13} />
              LOCAL LIBRARY ({matchingLocalSongs.length})
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {/* Idle State */}
        {!searchQuery.trim() && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-[50vh] gap-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#151518] border border-white/10 flex items-center justify-center shadow-lg">
              <SearchIcon size={26} className="text-[#8B90A0]" />
            </div>
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">Search Everything</h2>
            <p className="text-xs text-[#8B90A0] text-center max-w-sm leading-relaxed">
              Search tracks, artists, and albums across both your{' '}
              <span className="text-emerald-400 font-semibold font-mono">Local Files</span> and{' '}
              <span className="text-[#0070F3] font-semibold font-mono">Online Streaming</span>.
            </p>
          </motion.div>
        )}

        {/* Searching Loader */}
        {isSearching && searchQuery.trim() && (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-32 gap-3 text-[#8B90A0] text-xs font-mono"
          >
            <Loader2 size={18} className="animate-spin text-[#0070F3]" />
            Searching catalog for &quot;{searchQuery}&quot;...
          </motion.div>
        )}

        {/* No Results */}
        {!isSearching && searchQuery.trim() && !hasAnyResults && (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-[40vh] gap-2"
          >
            <Music size={36} className="text-[#8B90A0]/30" />
            <p className="text-xs font-mono font-semibold text-[#8B90A0]">No matches found for &quot;{searchQuery}&quot;</p>
          </motion.div>
        )}

        {/* Results */}
        {!isSearching && searchQuery.trim() && hasAnyResults && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* 1. Online Streaming Matches */}
            {(activeTab === 'all' || activeTab === 'online') && onlineTracks.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#0070F3] uppercase tracking-wider flex items-center gap-2">
                    <Radio size={14} /> INSTANT STREAMING MATCHES
                  </span>
                  <span className="font-mono text-[10px] text-[#8B90A0]">Click ▶ to stream</span>
                </div>

                <div className="space-y-1">
                  {onlineTracks.map((track, i) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => handlePlayStream(track)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        const trackId = track.ytVideoId || track.id;
                        if (trackId) {
                          const streamSong = createStreamSong({
                            id: `stream_${trackId}`,
                            title: track.title,
                            artist: track.artist,
                            album: track.album || 'Single',
                            duration: track.durationMs ? track.durationMs / 1000 : 0,
                            coverUrl: track.coverUrl || (track.ytVideoId ? `https://i.ytimg.com/vi/${track.ytVideoId}/hqdefault.jpg` : undefined),
                            ytVideoId: track.ytVideoId || '',
                          });
                          setContextMenu({ song: streamSong, x: e.clientX, y: e.clientY });
                        }
                      }}
                      className="group flex items-center gap-4 px-3.5 py-2.5 bg-[#151518] hover:bg-[#1C1B1B] border border-white/5 rounded-xl transition-all cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-lg bg-white/5 overflow-hidden shrink-0 relative">
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              if (track.ytVideoId) {
                                (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${track.ytVideoId}/mqdefault.jpg`;
                              }
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music size={16} className="text-white/20" />
                          </div>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayStream(track);
                          }}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer text-white"
                          title="Stream now"
                        >
                          <Play size={16} fill="currentColor" className="ml-0.5" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-[#0070F3] transition-colors truncate">{track.title}</p>
                        <p className="text-[11px] font-mono text-[#8B90A0] truncate mt-0.5">{track.artist} {track.album ? `• ${track.album}` : ''}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayStream(track);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-[#0070F3]/20 hover:bg-[#0070F3]/30 text-[#0070F3] font-mono text-[11px] font-bold rounded-md transition-colors cursor-pointer"
                        >
                          <Play size={11} fill="currentColor" />
                          PLAY
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToQueueStream(track);
                          }}
                          title="Add to queue"
                          className="p-1.5 text-[#8B90A0] hover:text-[#0070F3] transition-colors cursor-pointer"
                        >
                          <ListPlus size={15} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(track.spotifyUrl, track.title);
                          }}
                          title="Download for offline"
                          className="p-1.5 text-[#8B90A0] hover:text-white transition-colors cursor-pointer"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Local Library Matches */}
            {(activeTab === 'all' || activeTab === 'local') && matchingLocalSongs.length > 0 && (
              <section className="space-y-3">
                <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <HardDrive size={14} /> LOCAL LIBRARY MATCHES
                </span>

                <div className="space-y-1">
                  {matchingLocalSongs.map((song) => {
                    const isCurrent = currentSong?.id === song.id;
                    const coverSrc = song.coverPath ? getImageUrl(song.coverPath) : null;

                    return (
                      <motion.div
                        key={song.id}
                        whileTap={{ scale: 0.995 }}
                        onClick={() => {
                          const idx = matchingLocalSongs.findIndex((s) => s.id === song.id);
                          setQueue(matchingLocalSongs, idx >= 0 ? idx : 0, 'Local Search');
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ song, x: e.clientX, y: e.clientY });
                        }}
                        className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                          isCurrent ? 'bg-[#0070F3]/15 border border-[#0070F3]/30' : 'bg-[#151518] hover:bg-[#1C1B1B] border border-white/5'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                          {coverSrc ? (
                            <img src={coverSrc} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Music size={16} className="text-white/20" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#0070F3]' : 'text-white'}`}>
                            {song.title}
                          </p>
                          <p className="text-[11px] font-mono text-[#8B90A0] truncate mt-0.5">{song.artist} • {song.album}</p>
                        </div>

                        <span className="font-mono text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                          LOCAL
                        </span>

                        <span className="text-xs text-[#8B90A0] font-mono tabular-nums shrink-0">
                          {formatTime(song.duration)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 3. Local Albums */}
            {(activeTab === 'all' || activeTab === 'local') && matchingLocalAlbums.length > 0 && (
              <section className="space-y-3">
                <span className="font-mono text-xs font-bold text-[#8B90A0] uppercase tracking-wider flex items-center gap-2">
                  <Disc3 size={14} /> LOCAL ALBUMS
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {matchingLocalAlbums.map((album) => {
                    const coverSrc = album.coverPath ? getImageUrl(album.coverPath) : '/default-cover.png';
                    return (
                      <div
                        key={album.id}
                        onClick={() => navigate(`/albums/${album.id}`)}
                        className="group cursor-pointer bg-[#151518] hover:bg-[#1C1B1B] p-3 rounded-xl border border-white/5 transition-all"
                      >
                        <div className="rounded-lg overflow-hidden aspect-square mb-2 bg-white/5">
                          <img src={coverSrc} alt={album.name} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-xs font-bold text-white truncate">{album.name}</p>
                        <p className="text-[11px] font-mono text-[#8B90A0] truncate mt-0.5">{album.artist}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 4. Local Artists */}
            {(activeTab === 'all' || activeTab === 'local') && matchingLocalArtists.length > 0 && (
              <section className="space-y-3">
                <span className="font-mono text-xs font-bold text-[#8B90A0] uppercase tracking-wider flex items-center gap-2">
                  <Mic2 size={14} /> LOCAL ARTISTS
                </span>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {matchingLocalArtists.map((artist) => (
                    <div
                      key={artist.id}
                      onClick={() => navigate(`/artists/${artist.id}`)}
                      className="flex flex-col items-center gap-2 cursor-pointer shrink-0 group"
                    >
                      <div className="w-18 h-18 rounded-full bg-[#151518] border border-white/10 flex items-center justify-center overflow-hidden">
                        {artist.coverPath ? (
                          <img src={getImageUrl(artist.coverPath)} alt={artist.name} className="w-full h-full object-cover" />
                        ) : (
                          <Mic2 size={22} className="text-[#8B90A0]" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-white text-center w-20 truncate group-hover:text-[#0070F3] transition-colors">
                        {artist.name}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
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
