import { create } from 'zustand';
import type { Playlist, Track, DbPlaylist, DbPlaylistTrack } from '../types';
import { supabase } from '../lib/supabase';

function dbTrackToTrack(t: DbPlaylistTrack): Track {
  return {
    id: t.track_id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    albumArtist: t.album_artist,
    coverUrl: t.cover_url || '/default-cover.png',
    duration: t.duration,
    source: t.source as Track['source'],
    sourceId: t.source_id,
    position: t.position,
  };
}

function dbToPlaylist(db: DbPlaylist, tracks: Track[] = []): Playlist {
  return {
    id: db.id,
    ownerId: db.owner_id,
    title: db.title,
    description: db.description,
    coverUrl: db.cover_url,
    source: db.source as Playlist['source'],
    sourcePlaylistId: db.source_playlist_id,
    playlistType: db.playlist_type as Playlist['playlistType'],
    tracks,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    lastSyncedAt: db.last_synced_at,
  };
}

interface PlaylistStore {
  playlists: Playlist[];
  loading: boolean;
  fetchPlaylists: (userId: string) => Promise<void>;
  createPlaylist: (userId: string, title: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addTrack: (playlistId: string, track: Track) => Promise<void>;
  removeTrack: (playlistId: string, trackId: string) => Promise<void>;
  importSpotifyPlaylist: (userId: string, playlist: Omit<Playlist, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<Playlist>;
  syncFollowedPlaylist: (playlistId: string) => Promise<void>;
  getPlaylistById: (id: string) => Playlist | undefined;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [],
  loading: false,

  fetchPlaylists: async (userId) => {
    set({ loading: true });
    const { data: plData } = await supabase
      .from('playlists')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (!plData) { set({ loading: false }); return; }

    const playlists = await Promise.all(
      (plData as DbPlaylist[]).map(async (pl) => {
        const { data: tracks } = await supabase
          .from('playlist_tracks')
          .select('*')
          .eq('playlist_id', pl.id)
          .order('position');
        return dbToPlaylist(pl, (tracks as DbPlaylistTrack[] || []).map(dbTrackToTrack));
      })
    );
    set({ playlists, loading: false });
  },

  createPlaylist: async (userId, title, description) => {
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        owner_id: userId,
        title,
        description: description || '',
        playlist_type: 'owned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    const pl = dbToPlaylist(data as DbPlaylist, []);
    set((s) => ({ playlists: [pl, ...s.playlists] }));
    return pl;
  },

  deletePlaylist: async (playlistId) => {
    await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistId);
    await supabase.from('playlists').delete().eq('id', playlistId);
    set((s) => ({ playlists: s.playlists.filter((p) => p.id !== playlistId) }));
  },

  addTrack: async (playlistId, track) => {
    const { playlists } = get();
    const pl = playlists.find((p) => p.id === playlistId);
    const position = pl ? pl.tracks.length : 0;

    await supabase.from('playlist_tracks').insert({
      playlist_id: playlistId,
      track_id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      album_artist: track.albumArtist || '',
      cover_url: track.coverUrl,
      duration: track.duration,
      position,
      source: track.source,
      source_id: track.sourceId,
    });

    await supabase.from('playlists').update({ updated_at: new Date().toISOString() }).eq('id', playlistId);

    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId ? { ...p, tracks: [...p.tracks, { ...track, position }] } : p
      ),
    }));
  },

  removeTrack: async (playlistId, trackId) => {
    await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('track_id', trackId);

    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) } : p
      ),
    }));
  },

  importSpotifyPlaylist: async (userId, playlist) => {
    // Check for existing by sourcePlaylistId to avoid duplicates
    if (playlist.sourcePlaylistId) {
      const { data: existing } = await supabase
        .from('playlists')
        .select('id')
        .eq('owner_id', userId)
        .eq('source_playlist_id', playlist.sourcePlaylistId)
        .single();
      if (existing) {
        // Return existing with fresh tracks
        const { data: tracks } = await supabase
          .from('playlist_tracks')
          .select('*')
          .eq('playlist_id', existing.id)
          .order('position');
        const { data: plData } = await supabase.from('playlists').select('*').eq('id', existing.id).single();
        return dbToPlaylist(plData as DbPlaylist, (tracks as DbPlaylistTrack[] || []).map(dbTrackToTrack));
      }
    }

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        owner_id: userId,
        title: playlist.title,
        description: playlist.description || '',
        cover_url: playlist.coverUrl || null,
        source: playlist.source || 'spotify',
        source_playlist_id: playlist.sourcePlaylistId || null,
        playlist_type: playlist.playlistType || 'followed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;

    const dbPl = data as DbPlaylist;

    if (playlist.tracks.length > 0) {
      const trackRows = playlist.tracks.map((t, i) => ({
        playlist_id: dbPl.id,
        track_id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        album_artist: t.albumArtist || '',
        cover_url: t.coverUrl,
        duration: t.duration,
        position: i,
        source: t.source,
        source_id: t.sourceId,
      }));
      await supabase.from('playlist_tracks').insert(trackRows);
    }

    const pl = dbToPlaylist(dbPl, playlist.tracks);
    set((s) => ({ playlists: [pl, ...s.playlists] }));
    return pl;
  },

  syncFollowedPlaylist: async (playlistId) => {
    const { playlists } = get();
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl || !pl.sourcePlaylistId) return;

    // Update last_synced_at
    await supabase
      .from('playlists')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', playlistId);

    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId ? { ...p, lastSyncedAt: new Date().toISOString() } : p
      ),
    }));
  },

  getPlaylistById: (id) => get().playlists.find((p) => p.id === id),
}));
