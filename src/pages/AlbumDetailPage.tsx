import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibraryStore, usePlayerStore, useFavoritesStore, useToastStore } from '@/stores';
import { useDownloaderStore } from '@/modules/downloader/stores/useDownloaderStore';
import { useStreamingStore } from '@/stores/useStreamingStore';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Heart,
  Shuffle,
  Download,
  ListPlus,
  Loader2,
  Disc3,
} from 'lucide-react';
import { formatTime } from '@/utils';
import type { Song } from '@/types';
import { createStreamSong } from '@/types/music';
import { AddToPlaylistMenu } from '@/components/AddToPlaylistMenu';
import { SongContextMenu } from '@/components/SongContextMenu';
import { SafeImage } from '@/components/SafeImage';

interface DisplayAlbum {
  id: string;
  name: string;
  artist: string;
  coverUrl: string | null;
  year?: number;
  genre?: string;
  trackCount: number;
  totalDuration: number;
  copyright?: string;
  publisher?: string;
  popularity?: number;
  isOnline?: boolean;
}

export function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { getAlbumById, getAlbumSongs, addStreamSong } = useLibraryStore();
  const { currentSong, isPlaying, setQueue, setIsPlaying, shuffleMode, toggleShuffle, addToQueue } = usePlayerStore();
  const { isFavoriteSong, toggleFavoriteSong } = useFavoritesStore();
  const { downloadUrl } = useDownloaderStore();
  const { showToast } = useToastStore();

  const [albumData, setAlbumData] = useState<DisplayAlbum | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ song: Song; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadAlbum = async () => {
      setIsLoading(true);

      // 1. Try local library album match
      const localAlbum = getAlbumById(id);
      const localSongs = getAlbumSongs(id);

      if (localAlbum && localSongs.length > 0) {
        if (cancelled) return;
        setAlbumData({
          id: localAlbum.id,
          name: localAlbum.name,
          artist: localAlbum.artist,
          coverUrl: localAlbum.coverPath,
          year: localAlbum.year,
          genre: localAlbum.genre,
          trackCount: localAlbum.trackCount || localSongs.length,
          totalDuration: localSongs.reduce((acc, s) => acc + s.duration, 0),
          isOnline: false,
        });
        setSongs(localSongs);
        setIsLoading(false);
        return;
      }

      // 2. Fetch online/Spotify album metadata & tracks
      try {
        let metaUrl = id.startsWith('http') ? id : `https://open.spotify.com/album/${id}`;
        let meta: any = null;

        if (window.electronAPI?.spotify?.fetchUrl) {
          try {
            meta = await window.electronAPI.spotify.fetchUrl(metaUrl);
          } catch {
            meta = null;
          }
        }

        // If direct URL fetch fails, try searching the album title
        if (!meta && window.electronAPI?.spotify?.search) {
          const searchRes = await window.electronAPI.spotify.search(id, ['album']);
          const albumMatch = searchRes?.albums?.[0];
          if (albumMatch?.spotifyUrl) {
            try {
              meta = await window.electronAPI.spotify.fetchUrl(albumMatch.spotifyUrl);
            } catch {}
          }
        }

        if (cancelled) return;

        if (meta && meta.tracks && meta.tracks.length > 0) {
          const streamSongs: Song[] = meta.tracks.map((t: any, idx: number) => {
            const trackId = t.id || `${meta.id || id}_${idx}`;
            const s = createStreamSong({
              id: `stream_${trackId}`,
              title: t.title || `Track ${idx + 1}`,
              artist: t.artist || meta.artist || 'Unknown Artist',
              album: meta.title || t.album || id,
              duration: t.durationMs ? t.durationMs / 1000 : 180,
              coverUrl: t.coverUrl || meta.coverUrl || undefined,
              ytVideoId: t.ytVideoId || '',
            });
            s.track = t.trackNumber || idx + 1;
            if (meta.copyright) s.copyright = meta.copyright;
            if (meta.publisher) s.publisher = meta.publisher;

            addStreamSong(s);
            return s;
          });

          const durationSum = streamSongs.reduce((acc, s) => acc + s.duration, 0);

          setAlbumData({
            id: meta.id || id,
            name: meta.title || id,
            artist: meta.artist || 'Various Artists',
            coverUrl: meta.coverUrl || streamSongs[0]?.coverPath || null,
            year: meta.releaseDate ? new Date(meta.releaseDate).getFullYear() : undefined,
            genre: meta.genre || 'Music',
            trackCount: streamSongs.length,
            totalDuration: durationSum,
            copyright: meta.copyright,
            publisher: meta.publisher,
            popularity: meta.popularity,
            isOnline: true,
          });

          setSongs(streamSongs);
        } else {
          // Fallback empty album state
          setAlbumData({
            id,
            name: id,
            artist: 'Unknown Artist',
            coverUrl: null,
            trackCount: 0,
            totalDuration: 0,
          });
          setSongs([]);
        }
      } catch (err) {
        console.error('Failed fetching album details:', err);
        if (!cancelled) {
          setAlbumData({
            id,
            name: id,
            artist: 'Unknown Artist',
            coverUrl: null,
            trackCount: 0,
            totalDuration: 0,
          });
          setSongs([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadAlbum();
    return () => {
      cancelled = true;
    };
  }, [id, getAlbumById, getAlbumSongs, addStreamSong]);

  const isAlbumPlaying = useMemo(() => {
    if (!isPlaying || !currentSong || songs.length === 0) return false;
    return songs.some((s) => s.id === currentSong.id);
  }, [isPlaying, currentSong, songs]);

  const handlePlayAll = useCallback(() => {
    if (songs.length === 0 || !albumData) return;
    if (isAlbumPlaying) {
      setIsPlaying(!isPlaying);
      window.dispatchEvent(new CustomEvent('player:toggle'));
    } else {
      const startIndex = shuffleMode === 'on' ? Math.floor(Math.random() * songs.length) : 0;
      setQueue(songs, startIndex, albumData.name);
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent('player:play'));
    }
  }, [songs, albumData, isAlbumPlaying, isPlaying, setIsPlaying, shuffleMode, setQueue]);

  const handlePlaySong = useCallback(
    (song: Song, index: number) => {
      if (currentSong?.id === song.id) {
        setIsPlaying(!isPlaying);
        window.dispatchEvent(new CustomEvent('player:toggle'));
      } else {
        if (song.sourceType === 'streaming') {
          useStreamingStore.getState().resolveStreamUrl(song, true).catch(() => {});
        }
        setQueue(songs, index, albumData?.name || 'Album');
        setIsPlaying(true);
        window.dispatchEvent(new CustomEvent('player:play'));
      }
    },
    [currentSong, isPlaying, songs, albumData, setQueue, setIsPlaying],
  );

  const handleDownloadAlbum = useCallback(async () => {
    if (!songs.length) return;
    showToast(`Adding ${songs.length} tracks to downloader...`, 'info');
    for (const song of songs) {
      if (song.streamUrl || song.ytVideoId) {
        await downloadUrl(song.streamUrl || `https://youtube.com/watch?v=${song.ytVideoId}`);
      }
    }
  }, [songs, downloadUrl, showToast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-[#8B90A0]">
        <Loader2 size={32} className="animate-spin text-[#0070F3]" />
        <p className="text-xs font-mono">Loading album & tracks catalog...</p>
      </div>
    );
  }

  if (!albumData) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-[#8B90A0] gap-2">
        <Disc3 size={40} className="opacity-30" />
        <p className="text-sm font-bold text-white">Album Not Found</p>
        <button onClick={() => navigate(-1)} className="text-xs text-[#0070F3] hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* ── ALBUM HEADER (Redesigned) ──────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-[#151518] border border-white/10 p-6 md:p-8 shadow-2xl">
        {/* Background Artwork Ambient Glow */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <SafeImage
            src={albumData.coverUrl}
            className="w-full h-full object-cover filter brightness-50 blur-3xl scale-125 opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-[#0B0B0D]/80 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end">
          {/* Cover Art */}
          <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 bg-white/5">
            <SafeImage src={albumData.coverUrl} alt={albumData.name} className="w-full h-full object-cover" />
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#0070F3]/20 border border-[#0070F3]/30 text-[#0070F3]">
                {albumData.isOnline ? 'ONLINE ALBUM' : 'LOCAL ALBUM'}
              </span>
              {albumData.genre && (
                <span className="text-[10px] font-mono text-[#8B90A0] uppercase px-2 py-0.5 rounded bg-white/5 border border-white/5">
                  {albumData.genre}
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight italic truncate">
              {albumData.name}
            </h1>

            <p className="text-sm md:text-base text-[#9CA3AF] font-medium flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <span className="text-white font-bold hover:underline cursor-pointer" onClick={() => navigate(`/search?q=${encodeURIComponent(albumData.artist)}`)}>
                {albumData.artist}
              </span>
              {albumData.year && <span>• {albumData.year}</span>}
              <span>• {albumData.trackCount} tracks ({formatTime(albumData.totalDuration)})</span>
            </p>

            {/* Actions Row */}
            <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-6 py-3 bg-[#0070F3] hover:bg-[#1B82FF] text-white font-mono text-xs font-bold uppercase rounded-xl shadow-glow transition-all cursor-pointer"
              >
                {isAlbumPlaying ? (
                  <>
                    <Pause size={16} fill="currentColor" />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" />
                    <span>PLAY ALL</span>
                  </>
                )}
              </button>

              <button
                onClick={toggleShuffle}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  shuffleMode === 'on'
                    ? 'bg-[#0070F3]/20 border-[#0070F3] text-[#0070F3]'
                    : 'bg-white/5 border-white/10 text-[#8B90A0] hover:text-white'
                }`}
                title="Toggle Shuffle"
              >
                <Shuffle size={18} />
              </button>

              <button
                onClick={handleDownloadAlbum}
                className="p-3 rounded-xl bg-white/5 border border-white/10 text-[#8B90A0] hover:text-white transition-all cursor-pointer"
                title="Download Album"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── TRACK LIST TABLE (Requirement 2 & 3) ────────────────── */}
      <div className="space-y-1">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_120px_90px_140px] gap-4 px-4 py-2 text-[11px] font-mono font-bold text-[#8B90A0] uppercase border-b border-white/5">
          <span>#</span>
          <span>TITLE</span>
          <span className="hidden md:block">ARTIST</span>
          <span className="text-right">DURATION</span>
          <span className="text-center">ACTIONS</span>
        </div>

        {/* Tracks */}
        {songs.map((song, index) => {
          const isCurrent = currentSong?.id === song.id;

          return (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              onDoubleClick={() => handlePlaySong(song, index)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ song, x: e.clientX, y: e.clientY });
              }}
              className={`group grid grid-cols-[40px_1fr_120px_90px_140px] gap-4 px-4 py-3 rounded-xl items-center cursor-pointer transition-all ${
                isCurrent
                  ? 'bg-[#0070F3]/15 border border-[#0070F3]/30'
                  : 'bg-[#151518] hover:bg-[#1C1B1B] border border-white/5'
              }`}
            >
              {/* Index / Playing indicator */}
              <div className="flex items-center justify-center font-mono text-xs text-[#8B90A0]">
                {isCurrent && isPlaying ? (
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
                  <span className="group-hover:hidden">{index + 1}</span>
                )}
                <button
                  onClick={() => handlePlaySong(song, index)}
                  className="hidden group-hover:block text-white hover:text-[#0070F3]"
                >
                  {isCurrent && isPlaying ? (
                    <Pause size={14} fill="currentColor" />
                  ) : (
                    <Play size={14} fill="currentColor" />
                  )}
                </button>
              </div>

              {/* Title & Cover */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-white/5 overflow-hidden shrink-0">
                  <SafeImage src={song.coverPath} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#0070F3]' : 'text-white'}`}>
                    {song.title}
                  </p>
                  <p className="text-[10px] font-mono text-[#8B90A0] truncate md:hidden">{song.artist}</p>
                </div>
              </div>

              {/* Artist (Desktop) */}
              <div className="hidden md:block min-w-0">
                <p className="text-xs text-[#8B90A0] truncate">{song.artist}</p>
              </div>

              {/* Duration */}
              <div className="text-right font-mono text-xs text-[#8B90A0]">
                {formatTime(song.duration)}
              </div>

              {/* Quick Actions (Like, Queue, Playlist, Download) */}
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavoriteSong(song.id);
                  }}
                  className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
                    isFavoriteSong(song.id) ? 'text-[#0070F3]' : 'text-[#8B90A0] hover:text-white'
                  }`}
                  title="Like"
                >
                  <Heart size={14} fill={isFavoriteSong(song.id) ? 'currentColor' : 'none'} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToQueue(song);
                    showToast(`Added "${song.title}" to queue`, 'info');
                  }}
                  className="p-1.5 rounded text-[#8B90A0] hover:text-white hover:bg-white/10 transition-colors"
                  title="Add to queue"
                >
                  <ListPlus size={14} />
                </button>

                <div onClick={(e) => e.stopPropagation()}>
                  <AddToPlaylistMenu songId={song.id} />
                </div>

                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (song.streamUrl || song.ytVideoId) {
                      await downloadUrl(song.streamUrl || `https://youtube.com/watch?v=${song.ytVideoId}`);
                      showToast(`Downloading: ${song.title}`, 'success');
                    }
                  }}
                  className="p-1.5 rounded text-[#8B90A0] hover:text-white hover:bg-white/10 transition-colors"
                  title="Download"
                >
                  <Download size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Copyright & Publisher */}
      {(albumData.copyright || albumData.publisher) && (
        <div className="pt-6 border-t border-white/5 font-mono text-[11px] text-[#8B90A0] space-y-1">
          {albumData.copyright && <p>© {albumData.copyright}</p>}
          {albumData.publisher && <p>℗ {albumData.publisher}</p>}
        </div>
      )}

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
