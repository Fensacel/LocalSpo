import { create } from 'zustand';
import type { Track, PlayerState, RepeatMode } from '../types';

interface PlayerStore {
  // State
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  playerState: PlayerState;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  // Audio element ref (managed by AudioEngine component)
  audioRef: HTMLAudioElement | null;

  // Actions
  init: () => void;
  setAudioRef: (el: HTMLAudioElement | null) => void;
  loadTrack: (track: Track, autoPlay?: boolean) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setPlayerState: (state: PlayerState) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  clearQueue: () => void;
  addToQueue: (track: Track) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  playerState: 'idle',
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  isShuffled: false,
  repeatMode: 'off',
  audioRef: null,

  init: () => {
    // Restore volume from localStorage (UI preference only)
    const savedVol = localStorage.getItem('lsp_volume');
    if (savedVol) {
      const vol = parseFloat(savedVol);
      if (!isNaN(vol)) set({ volume: vol });
    }
  },

  setAudioRef: (el) => set({ audioRef: el }),

  loadTrack: (track, autoPlay = true) => {
    const { audioRef } = get();
    set({ currentTrack: track, playerState: 'loading', currentTime: 0, duration: 0 });
    if (audioRef) {
      // AudioEngine will handle actual src assignment via streamService
      audioRef.dispatchEvent(new CustomEvent('lsp:load', { detail: { track, autoPlay } }));
    }
  },

  setQueue: (tracks, startIndex = 0) => {
    set({ queue: tracks, queueIndex: startIndex });
    if (tracks.length > 0 && startIndex >= 0 && startIndex < tracks.length) {
      get().loadTrack(tracks[startIndex]);
    }
  },

  play: () => {
    const { audioRef, currentTrack } = get();
    if (!audioRef || !currentTrack) return;
    const src = audioRef.src;
    // Guard: never play if src is empty, root, or non-audio
    if (!src || src === window.location.origin + '/' || src === window.location.href) {
      console.error('[Player] Refusing to play: invalid audio src', src);
      set({ playerState: 'error' });
      return;
    }
    audioRef.play().catch((err) => {
      console.error('[Player] play() failed:', err);
      set({ playerState: 'error' });
    });
  },

  pause: () => {
    const { audioRef } = get();
    if (audioRef) audioRef.pause();
  },

  togglePlay: () => {
    const { playerState } = get();
    if (playerState === 'playing') get().pause();
    else get().play();
  },

  next: () => {
    const { queue, queueIndex, repeatMode, isShuffled } = get();
    if (queue.length === 0) return;

    let nextIndex: number;
    if (repeatMode === 'one') {
      nextIndex = queueIndex;
    } else if (isShuffled) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') nextIndex = 0;
        else return;
      }
    }
    set({ queueIndex: nextIndex });
    get().loadTrack(queue[nextIndex]);
  },

  previous: () => {
    const { queue, queueIndex, currentTime, audioRef } = get();
    // If more than 3s in, restart current track
    if (currentTime > 3 && audioRef) {
      audioRef.currentTime = 0;
      return;
    }
    const prevIndex = Math.max(0, queueIndex - 1);
    if (queue.length === 0) return;
    set({ queueIndex: prevIndex });
    get().loadTrack(queue[prevIndex]);
  },

  seek: (seconds) => {
    const { audioRef } = get();
    if (audioRef) {
      audioRef.currentTime = seconds;
      set({ currentTime: seconds });
    }
  },

  setVolume: (vol) => {
    const clamped = Math.max(0, Math.min(1, vol));
    const { audioRef } = get();
    if (audioRef) audioRef.volume = clamped;
    set({ volume: clamped, isMuted: clamped === 0 });
    localStorage.setItem('lsp_volume', String(clamped));
  },

  toggleMute: () => {
    const { isMuted, volume, audioRef } = get();
    const newMuted = !isMuted;
    if (audioRef) audioRef.muted = newMuted;
    set({ isMuted: newMuted });
    if (!newMuted && volume === 0) {
      get().setVolume(0.5);
    }
  },

  toggleShuffle: () => set((s) => ({ isShuffled: !s.isShuffled })),

  setRepeatMode: (mode) => set({ repeatMode: mode }),

  setPlayerState: (state) => set({ playerState: state }),

  setCurrentTime: (t) => set({ currentTime: t }),

  setDuration: (d) => set({ duration: d }),

  clearQueue: () => set({ queue: [], queueIndex: -1, currentTrack: null, playerState: 'idle' }),

  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
}));
