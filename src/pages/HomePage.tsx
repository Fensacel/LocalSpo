import { useState, useEffect, useMemo } from 'react';
import { useLibraryStore, usePlayerStore, usePlaylistStore, useHistoryStore, useFavoritesStore } from '@/stores';
import { Play, Pause, Music, ListPlus, Sparkles, RefreshCw, Plus, ListMusic, Heart } from 'lucide-react';
import { SongContextMenu } from '@/components/SongContextMenu';
import { ImportPlaylistModal } from '@/components/ImportPlaylistModal';
import { SearchBar } from '@/components/SearchBar';
import type { Song } from '@/types';

import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '@/utils';
import { createStreamSong } from '@/types/music';

interface FeaturedTrack {
  ytVideoId?: string;
  id?: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
}

export function HomePage() {
  const { songs } = useLibraryStore();
  const { playlists } = usePlaylistStore();
  const { currentSong, isPlaying, setIsPlaying, setQueue } = usePlayerStore();
  const { entries: historyEntries, loadHistory } = useHistoryStore();
  const { songIds, isFavoriteSong, toggleFavoriteSong } = useFavoritesStore();
  const navigate = useNavigate();

  const [featuredTracks, setFeaturedTracks] = useState<FeaturedTrack[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ song: Song; x: number; y: number } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Load history entries on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Dynamic Hero Banner Data: Prioritize currently playing/active song, fallback to featured track or local song
  const heroDisplayTrack = useMemo(() => {
    if (currentSong) {
      const cover = currentSong.coverPath
        ? getImageUrl(currentSong.coverPath)
        : (currentSong.remoteCoverUrl || (currentSong as any).coverUrl || '/default-cover.png');
      return {
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album || 'Single',
        coverUrl: cover,
        badge: isPlaying ? 'NOW PLAYING' : 'CURRENT TRACK',
        badgeColor: isPlaying ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-[#0070F3]/20 text-[#0070F3] border-[#0070F3]/30',
        isCurrent: true,
        rawSong: currentSong,
        rawFeatured: null as FeaturedTrack | null,
      };
    }

    if (featuredTracks.length > 0) {
      const ft = featuredTracks[0];
      return {
        title: ft.title,
        artist: ft.artist,
        album: ft.album || 'Single',
        coverUrl: ft.coverUrl,
        badge: 'SPOTLIGHT TRACK',
        badgeColor: 'bg-[#0070F3]/20 text-[#0070F3] border-[#0070F3]/30',
        isCurrent: false,
        rawSong: null as Song | null,
        rawFeatured: ft,
      };
    }

    if (songs.length > 0) {
      const s = songs[0];
      const cover = s.coverPath ? getImageUrl(s.coverPath) : '/default-cover.png';
      return {
        title: s.title,
        artist: s.artist,
        album: s.album || 'Single',
        coverUrl: cover,
        badge: 'LIBRARY HIGHLIGHT',
        badgeColor: 'bg-[#0070F3]/20 text-[#0070F3] border-[#0070F3]/30',
        isCurrent: false,
        rawSong: s,
        rawFeatured: null as FeaturedTrack | null,
      };
    }

    return {
      title: 'ECHOES OF THE NEON VOID',
      artist: 'Nero Genesis',
      album: 'Modular Reverb Edition',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600',
      badge: 'FEATURED ARTIST',
      badgeColor: 'bg-[#0070F3]/20 text-[#0070F3] border-[#0070F3]/30',
      isCurrent: false,
      rawSong: null as Song | null,
      rawFeatured: null as FeaturedTrack | null,
    };
  }, [currentSong, isPlaying, featuredTracks, songs]);

  // Load live online streaming tracks from YouTube Music
  useEffect(() => {
    let cancelled = false;

    const fetchFeatured = async () => {
      setIsLoadingFeatured(true);
      try {
        if (!window.electronAPI?.spotify?.search) {
          setIsLoadingFeatured(false);
          return;
        }

        const artistSet = new Set<string>();

        playlists.forEach((p) => {
          p.songIds.forEach((sid) => {
            const s = useLibraryStore.getState().getSongById(sid);
            if (s?.artist && s.artist.trim() && !/unknown|various/i.test(s.artist)) {
              artistSet.add(s.artist.trim());
            }
          });
        });

        songs.forEach((s) => {
          if (s.artist && s.artist.trim() && !/unknown|various/i.test(s.artist)) {
            artistSet.add(s.artist.trim());
          }
        });

        try {
          const raw = localStorage.getItem('localspo_user_searches');
          if (raw) {
            const userSearches: string[] = JSON.parse(raw);
            if (Array.isArray(userSearches)) {
              userSearches.forEach((q) => {
                if (q && q.trim()) artistSet.add(q.trim());
              });
            }
          }
        } catch {}

        const userArtists = Array.from(artistSet);
        let targetQueries: string[] = [];
        if (userArtists.length > 0) {
          const shuffled = [...userArtists].sort(() => Math.random() - 0.5);
          targetQueries = shuffled.slice(0, 3);
        } else {
          targetQueries = ['Pop Music Hits', 'Top Songs'];
        }

        const collectedTracks: FeaturedTrack[] = [];

        for (const query of targetQueries) {
          try {
            const res = await window.electronAPI.spotify.search(query, ['track']);
            if (res && Array.isArray(res.tracks)) {
              const valid = res.tracks
                .filter((t: any) => t.ytVideoId || t.id)
                .map((t: any) => ({
                  ytVideoId: t.ytVideoId,
                  id: t.id,
                  title: t.title,
                  artist: t.artist,
                  album: t.album || 'Single',
                  coverUrl:
                    t.coverUrl ||
                    (t.ytVideoId ? `https://i.ytimg.com/vi/${t.ytVideoId}/hqdefault.jpg` : '/default-cover.png'),
                }));
              collectedTracks.push(...valid);
            }
          } catch (err) {
            console.error('Failed fetching featured query:', query, err);
          }
        }

        if (cancelled) return;

        const trackMap = new Map<string, FeaturedTrack>();
        for (const t of collectedTracks) {
          const key = (t.ytVideoId || `${t.title}-${t.artist}`).toLowerCase();
          if (!trackMap.has(key)) {
            trackMap.set(key, t);
          }
        }

        const uniqueTracks = Array.from(trackMap.values()).sort(() => Math.random() - 0.5);
        setFeaturedTracks(uniqueTracks.slice(0, 15));
      } catch (err) {
        console.error('Failed to load online streaming tracks:', err);
      } finally {
        if (!cancelled) setIsLoadingFeatured(false);
      }
    };

    fetchFeatured();
    return () => {
      cancelled = true;
    };
  }, [songs.length, playlists.length]);

  const handlePlayStreamTrack = (track: FeaturedTrack) => {
    const trackId = track.ytVideoId || track.id;
    if (!trackId) return;

    const allStreamSongs = featuredTracks.map((t) => {
      const s = createStreamSong({
        id: `stream_${t.ytVideoId || t.id}`,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: 180,
        coverUrl: t.coverUrl,
        ytVideoId: t.ytVideoId || '',
      });
      useLibraryStore.getState().addStreamSong(s);
      return s;
    });

    const index = featuredTracks.findIndex((t) => (t.ytVideoId || t.id) === trackId);
    setQueue(allStreamSongs, index >= 0 ? index : 0, 'Featured Streaming');
    usePlayerStore.getState().setIsPlaying(true);
    window.dispatchEvent(new CustomEvent('player:play'));
  };

  const handleAddToQueueStreamTrack = (track: FeaturedTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    const trackId = track.ytVideoId || track.id;
    if (!trackId) return;
    const streamSong = createStreamSong({
      id: `stream_${trackId}`,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: 180,
      coverUrl: track.coverUrl,
      ytVideoId: track.ytVideoId || '',
    });
    useLibraryStore.getState().addStreamSong(streamSong);
    usePlayerStore.getState().addToQueue(streamSong);
  };

  // Dynamic Continue Listening items from listening history (or fallback to local songs)
  const continueListeningItems = useMemo(() => {
    if (historyEntries.length > 0) {
      const map = new Map<string, Song>();
      for (const entry of historyEntries) {
        if (entry.songData && !map.has(entry.songData.id)) {
          map.set(entry.songData.id, entry.songData);
        }
      }
      const uniqueSongs = Array.from(map.values()).slice(0, 3);
      return uniqueSongs.map((s) => ({
        song: s,
        title: s.title,
        artist: s.artist,
        cover: s.coverPath ? getImageUrl(s.coverPath) : (s.remoteCoverUrl || (s as any).coverUrl || '/default-cover.png'),
      }));
    }

    if (songs.length > 0) {
      return songs.slice(0, 3).map((s) => ({
        song: s,
        title: s.title,
        artist: s.artist,
        cover: s.coverPath ? getImageUrl(s.coverPath) : '/default-cover.png',
      }));
    }

    return [
      { song: null as Song | null, title: 'No History Yet', artist: 'Play a song to record history', cover: '/default-cover.png' },
    ];
  }, [historyEntries, songs]);

  // Dynamic Playlists list for "MADE FOR YOU"
  const madeForYouPlaylists = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      cover: string | null;
      action: () => void;
    }> = [
      {
        id: 'liked-songs',
        title: 'Liked Songs',
        subtitle: `${songIds.length} tracks`,
        cover: null,
        action: () => navigate('/favorites'),
      },
      {
        id: 'local-files',
        title: 'Local Files',
        subtitle: `${songs.length} files`,
        cover: null,
        action: () => navigate('/songs'),
      },
      ...playlists.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `${p.songIds.length} tracks`,
        cover: p.coverPath ? getImageUrl(p.coverPath) : null,
        action: () => navigate(`/playlists/${p.id}`),
      })),
    ];

    return list.slice(0, 6);
  }, [songIds.length, songs.length, playlists, navigate]);

  return (
    <div className="space-y-8 pb-12 select-none">
      {/* Search Bar & Import Playlist Header Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SearchBar />

        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0070F3]/15 hover:bg-[#0070F3]/25 border border-[#0070F3]/40 rounded-md text-xs font-mono font-bold text-[#0070F3] transition-all cursor-pointer shadow-glow shrink-0"
        >
          <Plus size={14} />
          Import Playlist
        </button>
      </div>

      {/* ── DYNAMIC HERO BANNER ─────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-[#151518] border border-white/10 shadow-2xl min-h-[300px] flex flex-col justify-end p-6 md:p-8">
        {/* Hero Background Art with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroDisplayTrack.coverUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-cover.png';
            }}
            className="w-full h-full object-cover filter brightness-60 contrast-110 blur-sm scale-105 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0D] via-[#0B0B0D]/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-transparent to-transparent" />
        </div>



        {/* Hero Content Block */}
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded border ${heroDisplayTrack.badgeColor}`}>
              {heroDisplayTrack.badge}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-none italic font-mono truncate max-w-xl">
              {heroDisplayTrack.title}
            </h1>
            <p className="text-xs md:text-sm text-[#9CA3AF] max-w-lg leading-relaxed pt-1 font-mono">
              {heroDisplayTrack.artist} • {heroDisplayTrack.album}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => {
                if (heroDisplayTrack.isCurrent) {
                  setIsPlaying(!isPlaying);
                  window.dispatchEvent(new CustomEvent('player:toggle'));
                } else if (heroDisplayTrack.rawFeatured) {
                  handlePlayStreamTrack(heroDisplayTrack.rawFeatured);
                } else if (heroDisplayTrack.rawSong) {
                  setQueue(songs, 0, 'Hero Featured');
                } else if (featuredTracks.length > 0) {
                  handlePlayStreamTrack(featuredTracks[0]);
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0070F3] hover:bg-[#1B82FF] text-white font-mono text-xs font-bold uppercase rounded-md shadow-glow transition-all cursor-pointer"
            >
              {heroDisplayTrack.isCurrent && isPlaying ? (
                <>
                  <Pause size={15} fill="currentColor" />
                  <span>PAUSE PLAYBACK</span>
                </>
              ) : (
                <>
                  <Play size={15} fill="currentColor" />
                  <span>{heroDisplayTrack.isCurrent ? 'RESUME PLAYBACK' : 'LISTEN NOW'}</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (heroDisplayTrack.rawFeatured) {
                  handleAddToQueueStreamTrack(heroDisplayTrack.rawFeatured, { stopPropagation: () => {} } as any);
                } else if (heroDisplayTrack.rawSong) {
                  usePlayerStore.getState().addToQueue(heroDisplayTrack.rawSong);
                }
              }}
              className="w-9 h-9 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer"
              title="Add to queue"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: CONTINUE LISTENING ─────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            CONTINUE LISTENING
          </span>
          <button
            onClick={() => navigate('/history')}
            className="font-mono text-[11px] text-[#8B90A0] hover:text-white cursor-pointer uppercase"
          >
            HISTORY
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {continueListeningItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (item.song) {
                  setQueue([item.song], 0, 'History');
                } else if (songs.length > 0) {
                  setQueue(songs, idx % songs.length, 'Continue Listening');
                }
              }}
              className="group flex items-center gap-3 p-3 bg-[#151518] hover:bg-[#1A1A1E] border border-white/5 hover:border-white/15 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <img
                src={item.cover}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-cover.png';
                }}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white group-hover:text-[#0070F3] transition-colors truncate">
                  {item.title}
                </p>
                <p className="text-[11px] font-mono text-[#8B90A0] truncate mt-0.5">
                  {item.artist}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 2: MADE FOR YOU (Playlists Grid) ────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            MADE FOR YOU
          </span>
          <button
            onClick={() => navigate('/songs')}
            className="font-mono text-[11px] text-[#8B90A0] hover:text-white cursor-pointer uppercase"
          >
            PLAYLISTS
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {madeForYouPlaylists.map((pl) => (
            <div
              key={pl.id}
              onClick={pl.action}
              className="group bg-[#151518] hover:bg-[#1C1B1B] p-2.5 rounded-xl border border-white/5 transition-all duration-200 cursor-pointer flex flex-col shadow-sm"
            >
              <div className="relative aspect-square w-full rounded-lg overflow-hidden mb-2 bg-[#0B0B0D] flex items-center justify-center border border-white/5">
                {pl.cover ? (
                  <img
                    src={pl.cover}
                    alt={pl.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-cover.png';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0070F3]/30 to-indigo-900/40">
                    <ListMusic size={24} className="text-[#0070F3]" />
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    pl.action();
                  }}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#0070F3] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-glow hover:scale-105 cursor-pointer"
                >
                  <Play size={14} fill="currentColor" className="ml-0.5" />
                </button>
              </div>

              <h3 className="text-xs font-bold text-white group-hover:text-[#0070F3] transition-colors truncate">
                {pl.title}
              </h3>
              <p className="text-[11px] font-mono text-[#8B90A0] truncate mt-0.5">
                {pl.subtitle}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: QUICK PICKS (Live Online Streaming Tracks) ─────────────── */}
      <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Sparkles size={16} className="text-[#0070F3]" />
              QUICK PICKS
            </span>
            <button
              onClick={() => navigate('/search')}
              className="font-mono text-[11px] text-[#8B90A0] hover:text-white uppercase tracking-wider cursor-pointer"
            >
              SHOW ALL
            </button>
          </div>

          {isLoadingFeatured && featuredTracks.length === 0 ? (
            <div className="flex items-center justify-center h-28 text-[#8B90A0] text-xs font-mono gap-2">
              <RefreshCw size={15} className="animate-spin text-[#0070F3]" />
              Loading Quick Picks...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {featuredTracks.slice(0, 9).map((track) => (
                <div
                  key={track.ytVideoId || track.id}
                  onClick={() => handlePlayStreamTrack(track)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const trackId = track.ytVideoId || track.id;
                    if (!trackId) return;
                    const streamSong = createStreamSong({
                      id: `stream_${trackId}`,
                      title: track.title,
                      artist: track.artist,
                      album: track.album,
                      duration: 180,
                      coverUrl: track.coverUrl,
                      ytVideoId: track.ytVideoId || '',
                    });
                    setContextMenu({ song: streamSong, x: e.clientX, y: e.clientY });
                  }}
                  className="group flex items-center gap-3 p-2.5 bg-[#151518] hover:bg-[#1C1B1B] border border-white/5 hover:border-white/10 rounded-xl transition-all duration-200 cursor-pointer shadow-sm"
                >
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-white/5 shadow-sm">
                    <img
                      src={track.coverUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        if (track.ytVideoId) {
                          (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${track.ytVideoId}/hqdefault.jpg`;
                        } else {
                          (e.target as HTMLImageElement).src = '/default-cover.png';
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayStreamTrack(track);
                      }}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                    >
                      <Play size={15} fill="currentColor" className="ml-0.5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-white group-hover:text-[#0070F3] transition-colors truncate leading-tight">
                      {track.title}
                    </h3>
                    <p className="text-[11px] font-mono text-[#8B90A0] truncate mt-0.5">
                      {track.artist}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const trackId = track.ytVideoId || track.id;
                        if (!trackId) return;
                        const sId = `stream_${trackId}`;
                        const isF = isFavoriteSong(sId);
                        if (!isF) {
                          const streamSong = createStreamSong({
                            id: sId,
                            title: track.title,
                            artist: track.artist,
                            album: track.album,
                            duration: 180,
                            coverUrl: track.coverUrl,
                            ytVideoId: track.ytVideoId || '',
                          });
                          useLibraryStore.getState().addStreamSong(streamSong);
                        }
                        toggleFavoriteSong(sId);
                      }}
                      title={isFavoriteSong(`stream_${track.ytVideoId || track.id}`) ? 'Remove from Favorites' : 'Add to Favorites'}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        isFavoriteSong(`stream_${track.ytVideoId || track.id}`)
                          ? 'text-[#0070F3]'
                          : 'text-[#8B90A0] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Heart size={15} fill={isFavoriteSong(`stream_${track.ytVideoId || track.id}`) ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      onClick={(e) => handleAddToQueueStreamTrack(track, e)}
                      title="Add to queue"
                      className="p-1.5 rounded-md text-[#8B90A0] hover:text-[#0070F3] hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <ListPlus size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      {/* ── SECTION 4: LOCAL LIBRARY ───────────────────────────────────────── */}
      <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Music size={16} className="text-emerald-400" />
              LOCAL LIBRARY ({songs.length})
            </span>
            {songs.length > 0 && (
              <button
                onClick={() => navigate('/songs')}
                className="font-mono text-[11px] text-[#8B90A0] hover:text-white uppercase tracking-wider cursor-pointer"
              >
                SHOW ALL
              </button>
            )}
          </div>

          {songs.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#151518] border border-white/5 flex flex-col items-center justify-center text-center gap-3">
              <Music size={28} className="text-[#8B90A0]/40" />
              <div>
                <p className="text-xs font-bold text-white font-mono">No local music files scanned yet</p>
                <p className="text-[11px] text-[#8B90A0] mt-1 font-mono">Add a local folder to scan MP3, FLAC, and M4A files</p>
              </div>
              <button
                onClick={async () => {
                  const folder = await window.electronAPI.dialog.openFolder();
                  if (folder) {
                    window.dispatchEvent(new CustomEvent('scan-folder', { detail: folder }));
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0070F3]/20 hover:bg-[#0070F3]/30 text-[#0070F3] border border-[#0070F3]/30 rounded-md text-xs font-mono font-bold transition-all cursor-pointer"
              >
                <Plus size={14} />
                Add Folder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {songs.slice(0, 12).map((song) => (
                <div
                  key={song.id}
                  onClick={() => {
                    const idx = songs.findIndex((s) => s.id === song.id);
                    setQueue(songs, idx >= 0 ? idx : 0, 'Local Library');
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ song, x: e.clientX, y: e.clientY });
                  }}
                  className="group bg-[#151518] hover:bg-[#1C1B1B] p-3 rounded-xl transition-all duration-200 cursor-pointer flex flex-col border border-white/5 shadow-sm"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-2.5 bg-white/5 flex items-center justify-center">
                    {song.coverPath ? (
                      <img src={getImageUrl(song.coverPath) || ''} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music size={22} className="text-white/20" />
                    )}
                    <button className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#0070F3] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-glow">
                      <Play size={14} fill="currentColor" className="ml-0.5" />
                    </button>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate">{song.title}</h3>
                  <p className="text-[11px] font-mono text-[#8B90A0] truncate mt-0.5">{song.artist}</p>
                </div>
              ))}
            </div>
          )}
        </section>

      {contextMenu && (
        <SongContextMenu
          song={contextMenu.song}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}

      <ImportPlaylistModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
