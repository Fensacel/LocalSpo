import { create } from 'zustand';
import type { Track, DbLikedSong } from '../types';
import { supabase } from '../lib/supabase';

interface FavoritesStore {
  likedSongs: Track[];
  loading: boolean;
  fetchLikedSongs: (userId: string) => Promise<void>;
  likeTrack: (userId: string, track: Track) => Promise<void>;
  unlikeTrack: (userId: string, trackId: string) => Promise<void>;
  isLiked: (trackId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  likedSongs: [],
  loading: false,

  fetchLikedSongs: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('liked_songs')
      .select('*')
      .eq('user_id', userId)
      .order('liked_at', { ascending: false });
    if (!data) { set({ loading: false }); return; }
    const tracks: Track[] = (data as DbLikedSong[]).map((r) => ({
      id: r.track_id,
      title: r.title,
      artist: r.artist,
      album: r.album,
      coverUrl: r.cover_url || '/default-cover.png',
      duration: r.duration,
      source: r.source as Track['source'],
      sourceId: r.source_id,
    }));
    set({ likedSongs: tracks, loading: false });
  },

  likeTrack: async (userId, track) => {
    const { likedSongs } = get();
    if (likedSongs.some((t) => t.id === track.id)) return;
    await supabase.from('liked_songs').insert({
      user_id: userId,
      track_id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      cover_url: track.coverUrl,
      duration: track.duration,
      source: track.source,
      source_id: track.sourceId,
      liked_at: new Date().toISOString(),
    });
    set((s) => ({ likedSongs: [track, ...s.likedSongs] }));
  },

  unlikeTrack: async (userId, trackId) => {
    await supabase.from('liked_songs').delete().eq('user_id', userId).eq('track_id', trackId);
    set((s) => ({ likedSongs: s.likedSongs.filter((t) => t.id !== trackId) }));
  },

  isLiked: (trackId) => get().likedSongs.some((t) => t.id === trackId),
}));
