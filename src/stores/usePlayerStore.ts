import { create } from 'zustand';
import type { Song, RepeatMode, ShuffleMode, SleepTimerOption } from '@/types';
import { useToastStore } from './useToastStore';
import { platformService } from '@/platform';
import { useLibraryStore } from './useLibraryStore';
import { useStreamingStore } from './useStreamingStore';
import { useSettingsStore } from './useSettingsStore';
import { createStreamSong } from '@/types/music';

interface PlayerState {
  // Current playback
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  isSeeking: boolean;

  // Queue
  queue: Song[];
  originalQueue: Song[];
  queueIndex: number;
  history: Song[];
  sourceName: string | null;

  // Modes & Timers
  repeatMode: RepeatMode;
  shuffleMode: ShuffleMode;
  sleepTimerOption: SleepTimerOption;
  sleepTimerEndsAt: number | null;
  sleepTimerRemainingSongs: number | null;
  sleepTimerTotalSongs: number | null;

  // UI state
  showQueue: boolean;
  showLyrics: boolean;
  showNowPlaying: boolean;
  showNowPlayingSidebar: boolean;

  // Actions
  loadSavedState: () => Promise<void>;
  setCurrentSong: (song: Song | null) => void;

  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsSeeking: (isSeeking: boolean) => void;

  // Queue actions
  setQueue: (songs: Song[], startIndex?: number, sourceName?: string) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  clearUserQueue: () => void;
  playNext: () => Song | null;
  playPrevious: () => Song | null;
  handleAutoplayNext: () => Promise<Song | null>;
  moveInQueue: (from: number, to: number) => void;

  // Mode & Timer actions
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setSleepTimer: (option: SleepTimerOption) => void;
  startSongsSleepTimer: (count: number) => void;
  startMinutesSleepTimer: (minutes: number) => void;
  clearSleepTimer: () => void;

  // UI actions
  toggleQueue: () => void;
  toggleLyrics: () => void;
  toggleNowPlaying: () => void;
  toggleNowPlayingSidebar: () => void;
  setShowNowPlaying: (show: boolean) => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function prefetchLyrics(song: Song | null) {
  if (!song || !window.electronAPI?.lyrics?.read) return;
  window.electronAPI.lyrics
    .read(
      song.id,
      song.path,
      song.lrcPath,
      song.hasEmbeddedLyrics,
      song.artist,
      song.title,
      song.album,
      song.duration
    )
    .catch(() => {});
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  playbackSpeed: 1,
  isSeeking: false,

  queue: [],
  originalQueue: [],
  queueIndex: -1,
  history: [],
  sourceName: null,

  repeatMode: 'off',
  shuffleMode: 'off',
  sleepTimerOption: 'off',
  sleepTimerEndsAt: null,
  sleepTimerRemainingSongs: null,
  sleepTimerTotalSongs: null,

  showQueue: false,
  showLyrics: false,
  showNowPlaying: false,
  showNowPlayingSidebar: false,

  setCurrentSong: (song) => {
    set({ currentSong: song });
    if (song) {
      prefetchLyrics(song);
      try {
        const raw = localStorage.getItem('localspo_recently_played_tracks');
        const existing: any[] = raw ? JSON.parse(raw) : [];
        const filtered = existing.filter((s) => s.id !== song.id);
        const updated = [song, ...filtered].slice(0, 20);
        localStorage.setItem('localspo_recently_played_tracks', JSON.stringify(updated));
        set({ history: updated });
      } catch {}
    }
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume, isMuted: false }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setIsSeeking: (isSeeking) => set({ isSeeking }),

  setQueue: (songs, startIndex = 0, sourceName) => {
    console.log('SETQUEUE');
    console.log(songs.length);
    console.log(startIndex);
    console.log(songs[startIndex]);

    if (songs.length === 0) {
      set({
        queue: [],
        originalQueue: [],
        queueIndex: -1,
        currentSong: null,
        isPlaying: false,
        sourceName: null,
      });
      console.log(get().currentSong);
      return;
    }

    const state = get();
    const originalQueue = [...songs];
    const safeStartIndex =
      Number.isInteger(startIndex) && startIndex >= 0 && startIndex < songs.length ? startIndex : 0;
    if (safeStartIndex !== startIndex) {
      console.error('[setQueue] Invalid startIndex. Falling back to index 0.', {
        startIndex,
        songsLength: songs.length,
      });
    }
    let queue: Song[];
    let queueIndex: number;

    if (state.shuffleMode === 'on') {
      const currentSong = songs[safeStartIndex];
      const rest = songs.filter((_, i) => i !== safeStartIndex);
      queue = [currentSong, ...shuffleArray(rest)];
      queueIndex = 0;
    } else {
      queue = [...songs];
      queueIndex = safeStartIndex;
    }

    const playingSong = queue[queueIndex] ?? null;
    if (playingSong) {
      prefetchLyrics(playingSong);
      if (queue[queueIndex + 1]) prefetchLyrics(queue[queueIndex + 1]);
      try {
        const raw = localStorage.getItem('localspo_recently_played_tracks');
        const existing: any[] = raw ? JSON.parse(raw) : [];
        const filtered = existing.filter((s) => s.id !== playingSong.id);
        const updated = [playingSong, ...filtered].slice(0, 20);
        localStorage.setItem('localspo_recently_played_tracks', JSON.stringify(updated));
        set({ history: updated });
      } catch {}
    }

    set({
      queue,
      originalQueue,
      queueIndex,
      currentSong: playingSong,
      isPlaying: true,
      sourceName: sourceName ?? null,
    });
    console.log(get().currentSong);
  },

  addToQueue: (song) =>
    set((state) => {
      const songWithFlag = { ...song, isUserQueued: true };

      // Update active queue
      const newQueue = [...state.queue];
      let insertIndex = state.queueIndex + 1;
      while (insertIndex < newQueue.length && newQueue[insertIndex].isUserQueued) {
        insertIndex++;
      }
      newQueue.splice(insertIndex, 0, songWithFlag);

      // Update original queue
      const newOriginalQueue = [...state.originalQueue];
      const origCurrentIndex = state.currentSong
        ? newOriginalQueue.findIndex((s) => s.id === state.currentSong?.id)
        : -1;

      let origInsertIndex = origCurrentIndex + 1;
      while (origInsertIndex < newOriginalQueue.length && newOriginalQueue[origInsertIndex].isUserQueued) {
        origInsertIndex++;
      }
      newOriginalQueue.splice(origInsertIndex, 0, songWithFlag);

      return {
        queue: newQueue,
        originalQueue: newOriginalQueue,
      };
    }),

  removeFromQueue: (index) =>
    set((state) => {
      const queue = state.queue.filter((_, i) => i !== index);
      const queueIndex = index < state.queueIndex ? state.queueIndex - 1 : state.queueIndex;
      return { queue, queueIndex };
    }),

  clearQueue: () =>
    set({
      queue: [],
      originalQueue: [],
      queueIndex: -1,
    }),

  clearUserQueue: () =>
    set((state) => {
      const queue = [...state.queue];
      const originalQueue = [...state.originalQueue];

      // Filter out user-queued songs from the remaining queue
      const played = queue.slice(0, state.queueIndex + 1);
      const remaining = queue.slice(state.queueIndex + 1).filter((s) => !s.isUserQueued);
      const newQueue = [...played, ...remaining];

      // Also filter originalQueue relative to current song
      const currentSong = state.currentSong;
      const origIndex = currentSong
        ? originalQueue.findIndex((s) => s.id === currentSong.id)
        : -1;
      const origPlayed = originalQueue.slice(0, origIndex + 1);
      const origRemaining = originalQueue.slice(origIndex + 1).filter((s) => !s.isUserQueued);
      const newOriginalQueue = [...origPlayed, ...origRemaining];

      return {
        queue: newQueue,
        originalQueue: newOriginalQueue,
      };
    }),

  playNext: () => {
    const state = get();
    const { queue, queueIndex, repeatMode, sleepTimerOption, sleepTimerRemainingSongs, sleepTimerTotalSongs } = state;

    if (queue.length === 0) return null;

    // Check sleep timer conditions before advancing
    if (sleepTimerOption === 'end_of_song') {
      set({
        isPlaying: false,
        sleepTimerOption: 'off',
        sleepTimerEndsAt: null,
        sleepTimerRemainingSongs: null,
        sleepTimerTotalSongs: null,
      });
      useToastStore.getState().showToast('Timer tidur: Lagu telah selesai', 'info');
      return null;
    }

    if (sleepTimerRemainingSongs !== null && sleepTimerRemainingSongs !== undefined) {
      const nextRemaining = sleepTimerRemainingSongs - 1;
      if (nextRemaining <= 0) {
        set({
          isPlaying: false,
          sleepTimerOption: 'off',
          sleepTimerEndsAt: null,
          sleepTimerRemainingSongs: null,
          sleepTimerTotalSongs: null,
        });
        useToastStore.getState().showToast(`Timer tidur: ${sleepTimerTotalSongs || 1} lagu telah selesai diputar`, 'info');
        return null;
      } else {
        set({ sleepTimerRemainingSongs: nextRemaining });
      }
    }

    if (sleepTimerOption === 'end_of_playlist' && queueIndex >= queue.length - 1) {
      set({
        isPlaying: false,
        sleepTimerOption: 'off',
        sleepTimerEndsAt: null,
        sleepTimerRemainingSongs: null,
        sleepTimerTotalSongs: null,
      });
      useToastStore.getState().showToast('Timer tidur: Playlist telah selesai', 'info');
      return null;
    }

    let nextIndex: number;

    if (repeatMode === 'one') {
      nextIndex = queueIndex;
    } else if (queueIndex < queue.length - 1) {
      nextIndex = queueIndex + 1;
    } else if (repeatMode === 'all') {
      nextIndex = 0;
    } else {
      // Reached the end of playlist/queue -> Trigger Autoplay!
      get().handleAutoplayNext();
      return null;
    }

    const nextSong = queue[nextIndex];
    const isSameSong = state.currentSong?.id === nextSong?.id;

    set({
      queueIndex: nextIndex,
      currentSong: nextSong,
      currentTime: 0,
      isPlaying: true,
      history: state.currentSong ? [...state.history, state.currentSong] : state.history,
    });

    if (isSameSong) {
      window.dispatchEvent(new CustomEvent('player:seek', { detail: 0 }));
    }
    return nextSong;
  },

  handleAutoplayNext: async () => {
    const state = get();
    const { queue, queueIndex } = state;
    if (queue.length === 0) return null;

    const autoplay = useSettingsStore.getState().autoplay ?? true;
    if (!autoplay) {
      set({ isPlaying: false });
      return null;
    }

    // Extract unique artist names from recent tracks in queue
    const recentSongs = queue.slice(Math.max(0, queue.length - 20));
    const artists = [...new Set(recentSongs.map((s) => s.artist).filter(Boolean))];
    const existingIds = new Set(queue.map((s) => s.id));
    const existingTitles = new Set(queue.map((s) => `${s.title.toLowerCase()}_${s.artist.toLowerCase()}`));

    let newSongs: Song[] = [];

    // 1. Check local library for unplayed songs by same artists
    const { songs: localSongs } = useLibraryStore.getState();
    const localMatches = localSongs.filter(
      (s) =>
        artists.some((art) => s.artist.toLowerCase().includes(art.toLowerCase())) &&
        !existingIds.has(s.id) &&
        !existingTitles.has(`${s.title.toLowerCase()}_${s.artist.toLowerCase()}`)
    );
    newSongs.push(...shuffleArray(localMatches));

    // 2. Query online Spotify/YouTube search for a DIVERSE mix across up to 4 different artists from the playlist
    if (window.electronAPI?.spotify && artists.length > 0) {
      const selectedArtists = shuffleArray(artists).slice(0, 4);
      try {
        const searchPromises = selectedArtists.map((artistName) =>
          window.electronAPI!.spotify.search(artistName, ['track'], 10)
        );
        const searchResultsList = await Promise.allSettled(searchPromises);

        const fetchedTracksPerArtist: Song[] = [];

        for (const res of searchResultsList) {
          if (res.status === 'fulfilled' && res.value?.tracks && res.value.tracks.length > 0) {
            const tracksForThisArtist = res.value.tracks
              .filter((t: any) => {
                const key = `stream_${t.ytVideoId || t.id}`;
                const titleKey = `${(t.title || t.name).toLowerCase()}_${(t.artist || t.artists?.[0]?.name || '').toLowerCase()}`;
                return !existingIds.has(key) && !existingTitles.has(titleKey);
              })
              .slice(0, 3) // Take top 3 diverse songs per artist
              .map((t: any) => {
                const streamSong = createStreamSong({
                  id: `stream_${t.ytVideoId || t.id}`,
                  title: t.title || t.name,
                  artist: t.artist || t.artists?.[0]?.name || 'Unknown Artist',
                  album: t.album?.name || t.album || 'Single',
                  duration: (t.durationMs || 180000) / 1000,
                  coverUrl: t.coverUrl || t.album?.images?.[0]?.url,
                  ytVideoId: t.ytVideoId || '',
                });
                useLibraryStore.getState().addStreamSong(streamSong);
                return streamSong;
              });
            fetchedTracksPerArtist.push(...tracksForThisArtist);
          }
        }

        // Shuffle the fetched tracks so artists are intermingled nicely
        newSongs.push(...shuffleArray(fetchedTracksPerArtist));
      } catch (err) {
        console.warn('[Autoplay] Diverse recommendation search error:', err);
      }
    }

    if (newSongs.length > 0) {
      const nextIndex = queueIndex + 1;
      const updatedQueue = [...state.queue, ...newSongs];
      const updatedOriginal = [...state.originalQueue, ...newSongs];
      const nextSong = updatedQueue[nextIndex];

      if (nextSong.sourceType === 'streaming') {
        useStreamingStore.getState().resolveStreamUrl(nextSong, true).catch(() => {});
      }

      set({
        queue: updatedQueue,
        originalQueue: updatedOriginal,
        queueIndex: nextIndex,
        currentSong: nextSong,
        currentTime: 0,
        isPlaying: true,
        history: state.currentSong ? [...state.history, state.currentSong] : state.history,
      });

      window.dispatchEvent(new CustomEvent('player:play'));

      useToastStore
        .getState()
        .showToast(`Autoplay: Memutar lagu serupa (${nextSong.artist} — ${nextSong.title})`, 'info');

      return nextSong;
    }

    set({ isPlaying: false });
    return null;
  },

  setSleepTimer: (option) => {
    if (option === 'off') {
      set({
        sleepTimerOption: 'off',
        sleepTimerEndsAt: null,
        sleepTimerRemainingSongs: null,
        sleepTimerTotalSongs: null,
      });
      useToastStore.getState().showToast('Timer tidur dimatikan', 'info');
      return;
    }

    let endsAt: number | null = null;
    let label = '';

    if (option === '15m') {
      endsAt = Date.now() + 15 * 60 * 1000;
      label = '15 menit';
    } else if (option === '30m') {
      endsAt = Date.now() + 30 * 60 * 1000;
      label = '30 menit';
    } else if (option === '45m') {
      endsAt = Date.now() + 45 * 60 * 1000;
      label = '45 menit';
    } else if (option === '1h') {
      endsAt = Date.now() + 60 * 60 * 1000;
      label = '1 jam';
    } else if (option === 'end_of_song') {
      label = 'setelah lagu ini selesai';
    } else if (option === 'end_of_playlist') {
      label = 'setelah playlist selesai';
    }

    set({
      sleepTimerOption: option,
      sleepTimerEndsAt: endsAt,
      sleepTimerRemainingSongs: option === 'end_of_song' ? 1 : null,
      sleepTimerTotalSongs: option === 'end_of_song' ? 1 : null,
    });
    useToastStore.getState().showToast(`Timer tidur diatur: ${label}`, 'info');
  },

  startSongsSleepTimer: (count) => {
    if (count <= 0) return;
    set({
      sleepTimerOption: count === 1 ? 'end_of_song' : 'off',
      sleepTimerEndsAt: null,
      sleepTimerRemainingSongs: count,
      sleepTimerTotalSongs: count,
    });
    useToastStore.getState().showToast(`Timer tidur diatur: Setelah ${count} lagu`, 'info');
  },

  startMinutesSleepTimer: (minutes) => {
    if (minutes <= 0) return;
    const endsAt = Date.now() + minutes * 60 * 1000;
    set({
      sleepTimerOption: 'off',
      sleepTimerEndsAt: endsAt,
      sleepTimerRemainingSongs: null,
      sleepTimerTotalSongs: null,
    });
    useToastStore.getState().showToast(`Timer tidur diatur: ${minutes} menit`, 'info');
  },

  clearSleepTimer: () => {
    set({
      sleepTimerOption: 'off',
      sleepTimerEndsAt: null,
      sleepTimerRemainingSongs: null,
      sleepTimerTotalSongs: null,
    });
  },

  playPrevious: () => {
    const state = get();
    const { queue, queueIndex, currentTime } = state;

    if (queue.length === 0) return null;

    // If more than 3 seconds in, restart current song
    if (currentTime > 3) {
      set({ currentTime: 0 });
      window.dispatchEvent(new CustomEvent('player:seek', { detail: 0 }));
      return state.currentSong;
    }

    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    const prevSong = queue[prevIndex];

    set({
      queueIndex: prevIndex,
      currentSong: prevSong,
      currentTime: 0,
      isPlaying: true,
    });
    return prevSong;
  },

  moveInQueue: (from, to) =>
    set((state) => {
      const queue = [...state.queue];
      const [moved] = queue.splice(from, 1);
      queue.splice(to, 0, moved);

      let queueIndex = state.queueIndex;
      if (from === queueIndex) {
        queueIndex = to;
      } else if (from < queueIndex && to >= queueIndex) {
        queueIndex--;
      } else if (from > queueIndex && to <= queueIndex) {
        queueIndex++;
      }

      return { queue, queueIndex };
    }),

  toggleRepeat: () =>
    set((state) => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const currentIndex = modes.indexOf(state.repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      
      let msg = '';
      if (nextMode === 'off') msg = 'Repeat off';
      else if (nextMode === 'all') msg = 'Repeat all songs';
      else if (nextMode === 'one') msg = 'Repeat one song';
      useToastStore.getState().showToast(msg, 'info');

      const updates: Partial<PlayerState> = { repeatMode: nextMode };

      // If turning repeat on and we reached the end of the queue (or it stopped),
      // reset to the first song in queue and start playing.
      if ((nextMode === 'all' || nextMode === 'one') && state.queue.length > 0) {
        const isAtEnd = state.queueIndex === state.queue.length - 1 || state.queueIndex === -1;
        if (isAtEnd && !state.isPlaying) {
          updates.queueIndex = 0;
          updates.currentSong = state.queue[0];
          updates.currentTime = 0;
          updates.isPlaying = true;
        }
      }

      return updates;
    }),

  toggleShuffle: () =>
    set((state) => {
      if (state.shuffleMode === 'off') {
        const currentIndex = state.queueIndex;
        const playedPart = state.queue.slice(0, currentIndex + 1);
        const remainingPart = state.queue.slice(currentIndex + 1);

        const userQueued = remainingPart.filter((s) => s.isUserQueued);
        const normalNextUp = remainingPart.filter((s) => !s.isUserQueued);

        const shuffledNormal = shuffleArray(normalNextUp);
        const newQueue = [...playedPart, ...userQueued, ...shuffledNormal];

        useToastStore.getState().showToast('Shuffle on', 'info');

        return {
          shuffleMode: 'on',
          queue: newQueue,
        };
      } else {
        const currentSong = state.currentSong;
        const newQueue = [...state.originalQueue];
        const newIndex = currentSong
          ? newQueue.findIndex((s) => s.id === currentSong.id)
          : 0;

        useToastStore.getState().showToast('Shuffle off', 'info');

        return {
          shuffleMode: 'off',
          queue: newQueue,
          queueIndex: Math.max(0, newIndex),
        };
      }
    }),

  toggleQueue: () =>
    set((state) => ({
      showQueue: !state.showQueue,
      showNowPlayingSidebar: false,
    })),
  toggleLyrics: () => set((state) => ({ showLyrics: !state.showLyrics })),
  toggleNowPlaying: () =>
    set((state) => ({
      showNowPlaying: !state.showNowPlaying,
    })),
  toggleNowPlayingSidebar: () =>
    set((state) => ({
      showNowPlayingSidebar: !state.showNowPlayingSidebar,
      showQueue: false,
    })),
  setShowNowPlaying: (show) => set({ showNowPlaying: show }),

  loadSavedState: async () => {
    try {
      let saved: any = null;
      const diskData = (await platformService.data.read('playerState.json')) as any;
      if (diskData && typeof diskData === 'object' && diskData.currentSong) {
        saved = diskData;
      } else {
        const raw = localStorage.getItem('localspo_saved_player_state');
        if (raw) saved = JSON.parse(raw);
      }

      if (saved && saved.currentSong) {
        if (saved.currentSong.ytVideoId || !saved.currentSong.path) {
          useLibraryStore.getState().addStreamSong(saved.currentSong);
        }
        if (Array.isArray(saved.queue)) {
          saved.queue.forEach((s: Song) => {
            if (s.ytVideoId || !s.path) {
              useLibraryStore.getState().addStreamSong(s);
            }
          });
        }

        set({
          currentSong: saved.currentSong,
          queue: saved.queue || [saved.currentSong],
          originalQueue: saved.originalQueue || saved.queue || [saved.currentSong],
          queueIndex: typeof saved.queueIndex === 'number' ? saved.queueIndex : 0,
          currentTime: typeof saved.currentTime === 'number' ? saved.currentTime : 0,
          isPlaying: false,
          volume: typeof saved.volume === 'number' ? saved.volume : 1,
          isMuted: !!saved.isMuted,
          repeatMode: saved.repeatMode || 'off',
          shuffleMode: saved.shuffleMode || 'off',
          sourceName: saved.sourceName || null,
        });

        setTimeout(() => {
          const items = [saved.currentSong, ...(saved.queue || [])];
          useStreamingStore.getState().prefetchPlaylist(items);
        }, 500);
      }
    } catch (err) {
      console.error('Failed to load saved player state:', err);
    }
  },
}));

let saveTimer: any = null;
const savePlayerStateToStorage = (state: PlayerState) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      if (!state.currentSong) return;
      const data = {
        currentSong: state.currentSong,
        queue: state.queue,
        originalQueue: state.originalQueue,
        queueIndex: state.queueIndex,
        currentTime: Math.floor(state.currentTime),
        isPlaying: state.isPlaying,
        volume: state.volume,
        isMuted: state.isMuted,
        repeatMode: state.repeatMode,
        shuffleMode: state.shuffleMode,
        sourceName: state.sourceName,
      };
      localStorage.setItem('localspo_saved_player_state', JSON.stringify(data));
      await platformService.data.write('playerState.json', data);
    } catch {}
  }, 1000);
};

usePlayerStore.subscribe((state) => {
  savePlayerStateToStorage(state);
});

