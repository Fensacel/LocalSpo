import { create } from 'zustand';
import type { ListeningStats, Track, DbRecentlyPlayed } from '../types';
import { supabase } from '../lib/supabase';

interface StatsStore {
  stats: ListeningStats | null;
  loading: boolean;
  fetchStats: (userId: string) => Promise<void>;
  recordPlay: (userId: string, track: Track, duration: number) => Promise<void>;
}

const emptyStats = (): ListeningStats => ({
  totalPlays: 0,
  totalDuration: 0,
  todayDuration: 0,
  weekDuration: 0,
  monthDuration: 0,
  yearDuration: 0,
  streak: 0,
  topSongs: [],
  topArtists: [],
  topAlbums: [],
  recentlyPlayed: [],
});

export const useStatsStore = create<StatsStore>((set) => ({
  stats: null,
  loading: false,

  fetchStats: async (userId) => {
    set({ loading: true });
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

      // Fetch user_statistics
      const { data: statsData } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fetch recently played
      const { data: recentData } = await supabase
        .from('recently_played')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(20);

      const recentlyPlayed = (recentData as DbRecentlyPlayed[] || []).map((r) => ({
        track: {
          id: r.track_id,
          title: r.title,
          artist: r.artist,
          album: r.album,
          coverUrl: r.cover_url || '/default-cover.png',
          duration: r.duration,
          source: r.source as Track['source'],
          sourceId: r.source_id,
        },
        playedAt: r.played_at,
      }));

      // Calculate period durations from recently_played
      const calcDuration = (rows: DbRecentlyPlayed[], since: string) =>
        rows.filter((r) => r.played_at >= since).reduce((sum, r) => sum + r.duration, 0);

      const allRecent = recentData as DbRecentlyPlayed[] || [];

      // Top songs: group by track_id
      const songMap = new Map<string, { track: Track; playCount: number }>();
      allRecent.forEach((r) => {
        const existing = songMap.get(r.track_id);
        if (existing) {
          existing.playCount++;
        } else {
          songMap.set(r.track_id, {
            track: {
              id: r.track_id,
              title: r.title,
              artist: r.artist,
              album: r.album,
              coverUrl: r.cover_url || '/default-cover.png',
              duration: r.duration,
              source: r.source as Track['source'],
              sourceId: r.source_id,
            },
            playCount: 1,
          });
        }
      });
      const topSongs = Array.from(songMap.values()).sort((a, b) => b.playCount - a.playCount).slice(0, 10);

      // Top artists
      const artistMap = new Map<string, { artist: string; playCount: number }>();
      allRecent.forEach((r) => {
        const existing = artistMap.get(r.artist);
        if (existing) existing.playCount++;
        else artistMap.set(r.artist, { artist: r.artist, playCount: 1 });
      });
      const topArtists = Array.from(artistMap.values()).sort((a, b) => b.playCount - a.playCount).slice(0, 10);

      // Top albums
      const albumMap = new Map<string, { album: string; artist: string; coverUrl?: string; playCount: number }>();
      allRecent.forEach((r) => {
        const existing = albumMap.get(r.album);
        if (existing) existing.playCount++;
        else albumMap.set(r.album, { album: r.album, artist: r.artist, coverUrl: r.cover_url, playCount: 1 });
      });
      const topAlbums = Array.from(albumMap.values()).sort((a, b) => b.playCount - a.playCount).slice(0, 10);

      const s: ListeningStats = {
        totalPlays: statsData?.total_plays || allRecent.length,
        totalDuration: statsData?.total_duration || allRecent.reduce((sum, r) => sum + r.duration, 0),
        todayDuration: calcDuration(allRecent, todayStart),
        weekDuration: calcDuration(allRecent, weekStart),
        monthDuration: calcDuration(allRecent, monthStart),
        yearDuration: calcDuration(allRecent, yearStart),
        streak: statsData?.streak || 0,
        topSongs,
        topArtists,
        topAlbums,
        recentlyPlayed,
      };

      set({ stats: s, loading: false });
    } catch {
      set({ stats: emptyStats(), loading: false });
    }
  },

  recordPlay: async (userId, track, duration) => {
    // Insert recently played
    await supabase.from('recently_played').insert({
      user_id: userId,
      track_id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      cover_url: track.coverUrl,
      duration,
      source: track.source,
      source_id: track.sourceId,
      played_at: new Date().toISOString(),
    });

    // Upsert stats
    const { data: existing } = await supabase
      .from('user_statistics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabase.from('user_statistics').update({
        total_plays: (existing.total_plays || 0) + 1,
        total_duration: (existing.total_duration || 0) + duration,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);
    } else {
      await supabase.from('user_statistics').insert({
        user_id: userId,
        total_plays: 1,
        total_duration: duration,
        streak: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  },
}));
