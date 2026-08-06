import { create } from 'zustand';
import { formatHours } from '@/utils';
import { useLibraryStore } from './useLibraryStore';

export interface TrackPlay {
  songId: string;
  title: string;
  artist: string;
  album: string;
  coverPath: string | null;
  duration: number; // seconds listened
  timestamp: number; // epoch ms
}

export interface StatsState {
  plays: TrackPlay[];
  totalListeningSeconds: number;
  recordPlay: (play: TrackPlay) => void;
  recordListeningTime: (seconds: number) => void;
  loadStats: () => Promise<void>;
  saveStats: () => Promise<void>;

  // Derived selectors in Seconds (internal)
  getTodaySeconds: () => number;
  getWeekSeconds: () => number;
  getMonthSeconds: () => number;
  getYearSeconds: () => number;
  getAverageDailySeconds: () => number;

  // Formatted Hours Selectors (for UI)
  getTodayHours: () => string;
  getWeekHours: () => string;
  getMonthHours: () => string;
  getYearHours: () => string;
  getLifetimeHours: () => string;
  getAverageDailyHours: () => string;

  getTopSongs: (limit?: number) => Array<{ id: string; title: string; artist: string; coverPath: string | null; count: number; totalSeconds: number; totalHoursFormatted: string }>;
  getTopArtists: (limit?: number) => Array<{ name: string; coverPath: string | null; count: number; totalSeconds: number; totalHoursFormatted: string }>;
  getTopAlbums: (limit?: number) => Array<{ name: string; coverPath: string | null; count: number; totalSeconds: number; totalHoursFormatted: string }>;
  getTopGenres: (limit?: number) => Array<{ genre: string; count: number }>;
  getRecentlyPlayed: (limit?: number) => TrackPlay[];
  getListeningStreak: () => number;
  resolveMissingCovers: () => Promise<void>;
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const useStatsStore = create<StatsState>((set, get) => ({
  plays: [],
  totalListeningSeconds: 0,

  recordPlay: (play) => {
    if (play.duration < 1) return;
    set((s) => ({
      plays: [...s.plays, play],
      totalListeningSeconds: s.totalListeningSeconds + Math.floor(play.duration),
    }));
    get().saveStats();
  },

  recordListeningTime: (seconds) => {
    if (seconds < 1) return;
    set((s) => ({
      totalListeningSeconds: s.totalListeningSeconds + Math.floor(seconds),
    }));
    get().saveStats();
  },

  loadStats: async () => {
    try {
      const data = (await window.electronAPI?.data?.read?.('stats.json')) as any;
      if (data?.plays && Array.isArray(data.plays)) {
        const total = (data.plays as TrackPlay[]).reduce((acc: number, p: TrackPlay) => acc + (p.duration || 0), 0);
        set({ plays: data.plays, totalListeningSeconds: total });
        get().resolveMissingCovers();
      }
    } catch (err) {
      console.error('[StatsStore] load error:', err);
    }
  },

  resolveMissingCovers: async () => {
    const plays = get().plays;
    if (!plays.length) return;

    let updated = false;
    const librarySongs = useLibraryStore.getState().songs;

    const newPlays = await Promise.all(
      plays.map(async (p) => {
        if (p.coverPath && p.coverPath.trim().length > 0) return p;

        // 1. Check local library
        const libSong = librarySongs.find(
          (s) => s.id === p.songId || s.title.toLowerCase() === p.title.toLowerCase(),
        );
        if (libSong?.coverPath || (libSong as any)?.remoteCoverUrl) {
          updated = true;
          return { ...p, coverPath: libSong?.coverPath || (libSong as any)?.remoteCoverUrl };
        }

        // 2. Fetch from Spotify API search
        if (window.electronAPI?.spotify?.search) {
          try {
            const query = `${p.title} ${p.artist}`.trim();
            const res = await window.electronAPI.spotify.search(query, ['track']);
            const trackMatch = res?.tracks?.[0];
            if (trackMatch?.coverUrl) {
              updated = true;
              return { ...p, coverPath: trackMatch.coverUrl };
            }
          } catch {}
        }

        return p;
      }),
    );

    if (updated) {
      set({ plays: newPlays });
      get().saveStats();
    }
  },

  saveStats: async () => {
    try {
      const plays = get().plays.slice(-10000);
      const totalListeningSeconds = get().totalListeningSeconds;
      const streak = get().getListeningStreak();
      await window.electronAPI?.data?.write?.('stats.json', {
        plays,
        totalListeningSeconds,
        streak,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('[StatsStore] save error:', err);
    }
  },

  getTodaySeconds: () => {
    const dayStart = startOfDay(Date.now());
    return get().plays.filter((p) => p.timestamp >= dayStart).reduce((a, p) => a + p.duration, 0);
  },

  getWeekSeconds: () => {
    const weekStart = Date.now() - 7 * 24 * 3600 * 1000;
    return get().plays.filter((p) => p.timestamp >= weekStart).reduce((a, p) => a + p.duration, 0);
  },

  getMonthSeconds: () => {
    const monthStart = Date.now() - 30 * 24 * 3600 * 1000;
    return get().plays.filter((p) => p.timestamp >= monthStart).reduce((a, p) => a + p.duration, 0);
  },

  getYearSeconds: () => {
    const yearStart = Date.now() - 365 * 24 * 3600 * 1000;
    return get().plays.filter((p) => p.timestamp >= yearStart).reduce((a, p) => a + p.duration, 0);
  },

  getAverageDailySeconds: () => {
    const plays = get().plays;
    if (!plays.length) return 0;
    const days = new Set(plays.map((p) => startOfDay(p.timestamp)));
    const total = plays.reduce((a, p) => a + p.duration, 0);
    return Math.round(total / (days.size || 1));
  },

  getTodayHours: () => formatHours(get().getTodaySeconds()),
  getWeekHours: () => formatHours(get().getWeekSeconds()),
  getMonthHours: () => formatHours(get().getMonthSeconds()),
  getYearHours: () => formatHours(get().getYearSeconds()),
  getLifetimeHours: () => formatHours(get().totalListeningSeconds),
  getAverageDailyHours: () => formatHours(get().getAverageDailySeconds()),

  getTopSongs: (limit = 10) => {
    const map = new Map<string, { id: string; title: string; artist: string; coverPath: string | null; count: number; totalSeconds: number }>();
    const librarySongs = useLibraryStore.getState().songs;
    const streamSongsMap = useLibraryStore.getState().streamSongsMap;
    const allAvailable = [...librarySongs, ...Object.values(streamSongsMap)];

    for (const p of get().plays) {
      const key = p.title.toLowerCase().trim() || p.songId;
      const libSong = allAvailable.find((s) => s.id === p.songId || s.title.toLowerCase() === p.title.toLowerCase());
      const resolvedCover = p.coverPath || libSong?.coverPath || (libSong as any)?.remoteCoverUrl || (libSong as any)?.coverUrl || null;

      const prev = map.get(key) ?? { id: p.songId, title: p.title, artist: p.artist, coverPath: resolvedCover, count: 0, totalSeconds: 0 };
      map.set(key, { ...prev, coverPath: prev.coverPath || resolvedCover, count: prev.count + 1, totalSeconds: prev.totalSeconds + p.duration });
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((item) => ({ ...item, totalHoursFormatted: formatHours(item.totalSeconds) }));
  },

  getTopArtists: (limit = 10) => {
    const map = new Map<string, { name: string; coverPath: string | null; count: number; totalSeconds: number }>();
    const librarySongs = useLibraryStore.getState().songs;
    const streamSongsMap = useLibraryStore.getState().streamSongsMap;
    const allAvailable = [...librarySongs, ...Object.values(streamSongsMap)];

    for (const p of get().plays) {
      const name = p.artist || 'Unknown Artist';
      const libSong = allAvailable.find((s) => s.artist.toLowerCase() === name.toLowerCase() && (s.coverPath || (s as any).remoteCoverUrl || (s as any).coverUrl));
      const resolvedCover = p.coverPath || libSong?.coverPath || (libSong as any)?.remoteCoverUrl || (libSong as any)?.coverUrl || null;

      const prev = map.get(name) ?? { name, coverPath: resolvedCover, count: 0, totalSeconds: 0 };
      map.set(name, { ...prev, coverPath: prev.coverPath || resolvedCover, count: prev.count + 1, totalSeconds: prev.totalSeconds + p.duration });
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((item) => ({ ...item, totalHoursFormatted: formatHours(item.totalSeconds) }));
  },

  getTopAlbums: (limit = 10) => {
    const map = new Map<string, { name: string; coverPath: string | null; count: number; totalSeconds: number }>();
    const librarySongs = useLibraryStore.getState().songs;
    const streamSongsMap = useLibraryStore.getState().streamSongsMap;
    const allAvailable = [...librarySongs, ...Object.values(streamSongsMap)];

    for (const p of get().plays) {
      const name = p.album || 'Unknown Album';
      const libSong = allAvailable.find((s) => s.album.toLowerCase() === name.toLowerCase() && (s.coverPath || (s as any).remoteCoverUrl || (s as any).coverUrl));
      const resolvedCover = p.coverPath || libSong?.coverPath || (libSong as any)?.remoteCoverUrl || (libSong as any)?.coverUrl || null;

      const prev = map.get(name) ?? { name, coverPath: resolvedCover, count: 0, totalSeconds: 0 };
      map.set(name, { ...prev, coverPath: prev.coverPath || resolvedCover, count: prev.count + 1, totalSeconds: prev.totalSeconds + p.duration });
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((item) => ({ ...item, totalHoursFormatted: formatHours(item.totalSeconds) }));
  },

  getTopGenres: (_limit = 10) => {
    return [];
  },

  getRecentlyPlayed: (limit = 20) => {
    const librarySongs = useLibraryStore.getState().songs;
    const streamSongsMap = useLibraryStore.getState().streamSongsMap;
    const allAvailable = [...librarySongs, ...Object.values(streamSongsMap)];

    return [...get().plays]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map((p) => {
        if (p.coverPath && p.coverPath.trim().length > 0) return p;
        const libSong = allAvailable.find((s) => s.id === p.songId || s.title.toLowerCase() === p.title.toLowerCase());
        return {
          ...p,
          coverPath: libSong?.coverPath || (libSong as any)?.remoteCoverUrl || (libSong as any)?.coverUrl || null,
        };
      });
  },

  getListeningStreak: () => {
    const plays = get().plays;
    if (!plays.length) return 0;

    // Calculate total listening seconds per calendar day
    const daySecondsMap = new Map<number, number>();
    for (const p of plays) {
      const day = startOfDay(p.timestamp);
      daySecondsMap.set(day, (daySecondsMap.get(day) || 0) + p.duration);
    }

    const MIN_STREAK_SECONDS = 900; // 15 minutes required per day
    let streak = 0;
    const today = startOfDay(Date.now());
    const yesterday = today - 24 * 3600 * 1000;

    // Start checking from today or yesterday if today hasn't reached 15 mins yet
    let checkDay = (daySecondsMap.get(today) || 0) >= MIN_STREAK_SECONDS ? today : yesterday;

    while ((daySecondsMap.get(checkDay) || 0) >= MIN_STREAK_SECONDS) {
      streak++;
      checkDay -= 24 * 3600 * 1000;
    }

    return streak;
  },
}));
