import { useMemo, useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaylistStore, useLibraryStore, usePlayerStore, useFavoritesStore, useToastStore } from '@/stores';
import { useFollowedPlaylistStore } from '@/stores/useFollowedPlaylistStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, X, ChevronLeft, RefreshCw, Clock, Archive,
  ListMusic, Camera, Trash2, Heart, Check, Shuffle, Sparkles, Music,
} from 'lucide-react';
import { formatTime, getImageUrl } from '@/utils';
import { createStreamSong } from '@/types/music';
import type { Song } from '@/types';
import { SafeImage } from '@/components/SafeImage';
import { SongContextMenu } from '@/components/SongContextMenu';
import { EditSongModal } from '@/components/EditSongModal';
import { SongDetailsModal } from '@/components/SongDetailsModal';
import { platformService } from '@/platform';

export function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    playlists,
    removeSongFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    addSongToPlaylist,
  } = usePlaylistStore();
  const { getSongById } = useLibraryStore();
  const { currentSong, isPlaying, setQueue, setIsPlaying, shuffleMode, toggleShuffle } = usePlayerStore();
  const { isFavoriteSong, toggleFavoriteSong } = useFavoritesStore();
  const followedStore = useFollowedPlaylistStore();

  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [viewingDetailsSong, setViewingDetailsSong] = useState<Song | null>(null);
  const [contextMenu, setContextMenu] = useState<{ song: Song; x: number; y: number } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recommendedSongsList, setRecommendedSongsList] = useState<Song[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const localPlaylist = useMemo(() => playlists.find((p) => p.id === id), [playlists, id]);
  const followedPlaylist = id ? followedStore.getFollowedPlaylist(id) : undefined;

  const playlist = useMemo(() => {
    if (localPlaylist) return localPlaylist;
    if (followedPlaylist) {
      return {
        id: followedPlaylist.id,
        name: followedPlaylist.name,
        description: followedPlaylist.description,
        coverPath: followedPlaylist.coverPath,
        songIds: followedPlaylist.tracks.map((t) => t.id),
        createdAt: followedPlaylist.lastSyncTime,
        updatedAt: followedPlaylist.lastSyncTime,
      };
    }
    return null;
  }, [localPlaylist, followedPlaylist]);

  const songs: Song[] = useMemo(() => {
    if (localPlaylist) {
      return localPlaylist.songIds
        .map((sId) => getSongById(sId))
        .filter((s): s is Song => s !== undefined);
    }
    if (followedPlaylist) return followedPlaylist.tracks;
    return [];
  }, [localPlaylist, followedPlaylist, getSongById]);

  const totalDuration = useMemo(() => songs.reduce((acc, s) => acc + (s.duration || 0), 0), [songs]);

  // Auto-follow imported streaming playlists
  useEffect(() => {
    if (followedPlaylist && !followedPlaylist.isFollowed && id) {
      followedStore.followPlaylist({
        id,
        provider: followedPlaylist.provider,
        playlistUrl: followedPlaylist.playlistUrl,
        name: followedPlaylist.name,
        description: followedPlaylist.description,
        coverUrl: followedPlaylist.coverPath,
        tracks: followedPlaylist.tracks,
      });
    }
  }, [followedPlaylist, id]);

  const fetchRecommendations = useCallback(async () => {
    if (!playlist) return;
    try {
      const existingIds = new Set(playlist.songIds);
      const recSongs: Song[] = [];
      const playlistArtists = Array.from(new Set(songs.map((s) => s.artist).filter(Boolean)));
      const query = playlistArtists.length > 0
        ? playlistArtists[Math.floor(Math.random() * playlistArtists.length)]
        : 'Trending Hits';

      const res = await window.electronAPI?.spotify?.search?.(query, ['track']);
      if (res && Array.isArray(res.tracks)) {
        for (const t of res.tracks) {
          const trackId = t.ytVideoId || t.id;
          if (!trackId) continue;
          const streamId = `stream_${trackId}`;
          if (existingIds.has(streamId)) continue;
          const s = createStreamSong({
            id: streamId,
            title: t.title,
            artist: t.artist,
            album: t.album || 'Single',
            duration: t.durationMs ? t.durationMs / 1000 : 180,
            coverUrl: t.coverUrl || (t.ytVideoId ? `https://i.ytimg.com/vi/${t.ytVideoId}/hqdefault.jpg` : undefined),
            ytVideoId: t.ytVideoId || '',
          });
          recSongs.push(s);
        }
      }
      setRecommendedSongsList(recSongs.slice(0, 5));
    } catch (err) {
      console.error('[PlaylistDetailPage] Failed to load recommendations:', err);
    }
  }, [playlist, songs]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const isPlaylistPlaying = useMemo(() => {
    if (!isPlaying || !currentSong || songs.length === 0) return false;
    return songs.some((s) => s.id === currentSong.id);
  }, [isPlaying, currentSong, songs]);

  const handlePlayAll = useCallback(() => {
    if (songs.length === 0 || !playlist) return;
    if (isPlaylistPlaying) {
      setIsPlaying(!isPlaying);
      window.dispatchEvent(new CustomEvent('player:toggle'));
    } else {
      const startIndex = shuffleMode === 'on' ? Math.floor(Math.random() * songs.length) : 0;
      setQueue(songs, startIndex, playlist.name);
    }
  }, [songs, playlist, isPlaylistPlaying, isPlaying, setIsPlaying, shuffleMode, setQueue]);

  const handleSyncNow = async () => {
    if (!id || !playlist) return;
    setIsSyncing(true);
    try {
      if (followedPlaylist) {
        await followedStore.syncPlaylist(id);
        useToastStore.getState().showToast?.(`Synced "${playlist.name}"!`, 'success');
      } else {
        const found = followedStore.followedPlaylists.find((p) => p.id === id || p.name === playlist.name);
        if (found) {
          await followedStore.syncPlaylist(found.id);
          useToastStore.getState().showToast?.(`Synced "${playlist.name}"!`, 'success');
        } else {
          await fetchRecommendations();
          useToastStore.getState().showToast?.(`Refreshed recommendations for "${playlist.name}"!`, 'info');
        }
      }
    } catch (err: any) {
      console.error('[PlaylistDetailPage] Sync error:', err);
      // If sync failed for a local non-remote playlist, fallback to refreshing recommendations
      await fetchRecommendations();
      useToastStore.getState().showToast?.('Refreshed playlist data', 'info');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleChangeCover = async () => {
    if (!id || !localPlaylist) return;
    const file = await platformService.dialog.openImage();
    if (file) updatePlaylist(id, { coverPath: file });
  };

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && id && localPlaylist) updatePlaylist(id, { name: trimmed });
    setEditingName(false);
  };

  const handleDeletePlaylist = async () => {
    if (!id || !localPlaylist) return;
    await deletePlaylist(id);
    navigate('/playlists');
  };

  if (!playlist) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-text/40 font-mono">
        Playlist not found
      </div>
    );
  }

  const coverSrc = playlist.coverPath
    ? getImageUrl(playlist.coverPath)
    : songs.length > 0
      ? songs[0].coverPath || (songs[0] as any).remoteCoverUrl || null
      : null;

  return (
    <div className="pb-16 select-none">
      {/* Back button */}
      <button
        onClick={() => navigate('/playlists')}
        className="flex items-center gap-1.5 text-xs font-semibold text-text/55 hover:text-primary transition-colors mb-6 group no-drag"
      >
        <ChevronLeft size={16} className="transform group-hover:-translate-x-0.5 transition-transform" />
        Back to Playlists
      </button>

      {/* Header */}
      <div className="relative mb-8">
        {/* Background blur */}
        {coverSrc && (
          <div className="absolute -inset-6 -top-20 overflow-hidden pointer-events-none">
            <img
              src={coverSrc}
              alt=""
              className="w-full h-64 object-cover opacity-20 blur-3xl scale-150"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/50 to-bg" />
          </div>
        )}

        <div className="relative flex gap-6 items-end">
          {/* Cover — clickable only for local playlists */}
          {localPlaylist ? (
            <button
              onClick={handleChangeCover}
              className="group/cover relative w-48 h-48 rounded-2xl overflow-hidden shrink-0 shadow-2xl bg-white/[0.03] border border-white/5 cursor-pointer"
            >
              {coverSrc ? (
                <img src={coverSrc} alt={playlist.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <ListMusic size={48} className="text-text/10 absolute inset-0 m-auto" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/50 transition-all flex flex-col items-center justify-center gap-2 opacity-0 group-hover/cover:opacity-100">
                <Camera size={24} className="text-white" />
                <span className="text-[11px] font-semibold text-white">Change cover</span>
              </div>
            </button>
          ) : (
            <div className="w-48 h-48 rounded-2xl overflow-hidden shrink-0 shadow-2xl bg-white/[0.03] border border-white/10">
              <SafeImage src={playlist.coverPath} alt={playlist.name} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="pb-2 flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-1">Playlist</p>

            {/* Editable name (local only) */}
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-2xl font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/50 flex-1"
                />
                <button onClick={commitName} className="p-1.5 bg-primary text-zinc-950 rounded-lg"><Check size={16} /></button>
                <button onClick={() => setEditingName(false)} className="p-1.5 text-text/50 hover:text-text rounded-lg"><X size={16} /></button>
              </div>
            ) : (
              <h1
                onClick={() => {
                  if (!localPlaylist) return;
                  setNameValue(playlist.name);
                  setEditingName(true);
                }}
                className={`text-3xl font-bold mb-2 truncate ${localPlaylist ? 'cursor-pointer hover:bg-white/5 px-2 py-0.5 rounded-lg -ml-2 inline-block transition-colors' : 'text-white'}`}
                title={localPlaylist ? 'Click to edit name' : undefined}
              >
                {playlist.name}
              </h1>
            )}

            <p className="text-xs text-text/50 mb-2 truncate max-w-lg">{playlist.description || ''}</p>
            <p className="text-xs text-text/30 mb-4">
              {songs.length} song{songs.length !== 1 ? 's' : ''} • {formatTime(totalDuration)}
              {followedPlaylist?.lastSyncTime && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Clock size={11} className="inline" />
                  {' '}Last synced {new Date(followedPlaylist.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Play / Pause */}
              {songs.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handlePlayAll}
                  className="w-12 h-12 bg-primary text-zinc-950 rounded-full flex items-center justify-center shadow-lg shadow-primary/25 hover:bg-primary-hover transition-all cursor-pointer shrink-0"
                >
                  {isPlaylistPlaying
                    ? <Pause size={22} fill="currentColor" />
                    : <Play size={22} fill="currentColor" className="ml-0.5" />}
                </motion.button>
              )}

              {/* Shuffle */}
              {songs.length > 1 && (
                <button
                  onClick={toggleShuffle}
                  className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                    shuffleMode !== 'off'
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-white/5 border-white/10 text-text/50 hover:text-text'
                  }`}
                  title={
                    shuffleMode === 'off'
                      ? 'Enable Shuffle'
                      : shuffleMode === 'on'
                      ? 'Enable Smart Shuffle ✨'
                      : 'Disable Shuffle'
                  }
                >
                  <div className="relative flex items-center justify-center">
                    <Shuffle size={16} />
                    {shuffleMode === 'smart' && (
                      <Sparkles size={10} className="absolute -top-1.5 -right-2 text-primary fill-current animate-pulse" />
                    )}
                  </div>
                </button>
              )}

              {/* Refresh / Sync Playlist */}
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-text/60 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                title="Refresh / Sync Playlist"
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin text-primary' : ''} />
              </button>

              {/* Delete (local playlists only) */}
              {localPlaylist && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/15 hover:border-red-500/30 text-text/40 hover:text-red-400 transition-all cursor-pointer"
                  title="Delete Playlist"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div className="space-y-0.5 mb-10">
        {songs.length > 0 && (
          <div className="grid grid-cols-[36px_1fr_40px_50px] md:grid-cols-[40px_3fr_2fr_40px_60px] items-center gap-4 px-3 py-2 border-b border-white/10 text-xs font-mono font-bold text-text/40 uppercase tracking-wider mb-2 select-none">
            <span className="text-center">#</span>
            <span>Title</span>
            <span className="hidden md:block">Album</span>
            <span className="text-center">
              <Heart size={13} className="mx-auto text-text/30" />
            </span>
            <div className="flex justify-end pr-1">
              <Clock size={14} className="text-text/40" />
            </div>
          </div>
        )}

        {songs.map((song, index) => {
          const isCurrent = currentSong?.id === song.id;
          const isFav = isFavoriteSong(song.id);

          return (
            <div
              key={song.id}
              onClick={() => {
                setQueue(songs, index, playlist.name);
                setIsPlaying(true);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ song, x: e.clientX, y: e.clientY });
              }}
              className={`grid grid-cols-[36px_1fr_40px_50px] md:grid-cols-[40px_3fr_2fr_40px_60px] items-center gap-4 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group border border-transparent hover:border-white/5 ${
                isCurrent ? 'bg-white/[0.03]' : ''
              }`}
            >
              {/* Index / Playing indicator */}
              <div className="w-8 text-center shrink-0">
                {isCurrent && isPlaying ? (
                  <Music size={13} className="text-primary animate-pulse mx-auto" />
                ) : (
                  <span className="text-xs font-mono font-bold text-text/30 group-hover:hidden">{index + 1}</span>
                )}
                {!(isCurrent && isPlaying) && (
                  <Play size={12} fill="currentColor" className="text-white hidden group-hover:block mx-auto" />
                )}
              </div>

              {/* Artwork & Info (Title + Artist) */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/5">
                  <SafeImage src={song.coverPath} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold truncate transition-colors ${isCurrent ? 'text-primary' : 'text-white group-hover:text-primary'}`}>
                    {song.title}
                  </p>
                  <p className="text-[11px] text-text/40 truncate">{song.artist}</p>
                </div>
              </div>

              {/* Album */}
              <div className="hidden md:block min-w-0">
                <p className="text-xs text-text/40 truncate">{song.album || 'Single'}</p>
              </div>

              {/* Like / Favorite Button */}
              <div className="flex items-center justify-center">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavoriteSong(song.id); }}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md ${isFav ? 'opacity-100 text-red-400' : 'text-text/30 hover:text-red-400'}`}
                >
                  <Heart size={13} fill={isFav ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Duration */}
              <div className="text-right pr-1">
                <span className="text-xs font-mono text-text/30">{formatTime(song.duration)}</span>
              </div>
            </div>
          );
        })}

        {songs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-text/30 gap-2">
            <ListMusic size={36} className="opacity-20" />
            <p className="text-xs">This playlist is empty</p>
          </div>
        )}
      </div>

      {/* Archived Tracks */}
      {followedPlaylist && followedPlaylist.archivedTracks.length > 0 && (
        <div className="space-y-3 mb-10 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-400 font-mono uppercase flex items-center gap-2">
              <Archive size={14} /> Archived Tracks ({followedPlaylist.archivedTracks.length})
            </h3>
            <button
              onClick={() => followedStore.clearArchivedTracks(followedPlaylist.id)}
              className="text-[10px] font-mono text-text/40 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1">
            {followedPlaylist.archivedTracks.map((song, i) => (
              <div key={`${song.id}_arch_${i}`} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-xs text-text/60">
                <SafeImage src={song.coverPath} className="w-7 h-7 rounded shrink-0 object-cover" />
                <span className="font-semibold text-white truncate">{song.title}</span>
                <span className="text-text/40 truncate">— {song.artist}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Songs */}
      {recommendedSongsList.length > 0 && (
        <div className="space-y-2 border-t border-white/5 pt-6">
          <h2 className="text-xs font-bold text-text/40 uppercase tracking-wider font-mono mb-3">
            Recommended
          </h2>
          {recommendedSongsList.map((song) => (
            <div
              key={song.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] cursor-pointer group"
              onClick={() => {
                setQueue([...songs, song], songs.length, playlist.name);
                setIsPlaying(true);
              }}
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/5">
                <SafeImage src={song.coverPath} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate group-hover:text-primary transition-colors">{song.title}</p>
                <p className="text-[11px] text-text/40 truncate">{song.artist}</p>
              </div>
              {localPlaylist && (
                <button
                  onClick={(e) => { e.stopPropagation(); addSongToPlaylist(id!, song); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-all text-[10px] font-bold"
                >
                  + Add
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#141416] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4"
            >
              <h3 className="text-sm font-bold text-white">Delete Playlist?</h3>
              <p className="text-xs text-text/50">
                Are you sure you want to delete <strong>"{playlist.name}"</strong>? This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-xs font-semibold text-text/60 hover:text-text hover:bg-white/5 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleDeletePlaylist} className="px-4 py-2 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors cursor-pointer">
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Song Context Menu */}
      {contextMenu && (
        <SongContextMenu
          song={contextMenu.song}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEditSong={() => setEditingSong(contextMenu.song)}
          onViewDetails={() => setViewingDetailsSong(contextMenu.song)}
          onRemoveFromPlaylist={localPlaylist ? () => removeSongFromPlaylist(id!, contextMenu.song.id) : undefined}
        />
      )}

      {/* Edit Song Modal */}
      <EditSongModal
        song={editingSong}
        isOpen={!!editingSong}
        onClose={() => setEditingSong(null)}
      />

      {/* Song Details Modal */}
      <SongDetailsModal
        song={viewingDetailsSong}
        isOpen={!!viewingDetailsSong}
        onClose={() => setViewingDetailsSong(null)}
      />
    </div>
  );
}
