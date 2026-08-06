/**
 * useWindowsTaskbar.ts
 *
 * Renderer-side hook that syncs the player store with Windows Taskbar Integration:
 *   1. Dynamic window title
 *   2. Thumbnail toolbar buttons (Prev / Play-Pause / Next / Like)
 *   3. Thumbnail overlay icon (▶ / ⏸ badge)
 *   4. Thumbnail preview image (album artwork)
 *   5. Web Media Session API (hardware media keys + Windows media flyout)
 *
 * This hook must be mounted once at the app root level (App.tsx).
 * It reads from the existing player store and favorites store —
 * it never duplicates playback logic.
 */

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useFavoritesStore } from '@/stores/useFavoritesStore';

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildTitle(
  song: { artist?: string; title?: string } | null,
  isPlaying: boolean,
): string {
  if (!song) return 'LocalSpo';
  const artist = song.artist || 'Unknown Artist';
  const title = song.title || 'Unknown Title';
  const state = isPlaying ? '[Playing]' : '[Paused]';
  return `${state} ${artist} - ${title} | LocalSpo`;
}

/** Return the best available cover URL for a song */
function resolveCoverSource(song: {
  coverUrl?: string | null;
  cover?: string | null;
  path?: string | null;
} | null): string | null {
  if (!song) return null;
  return song.coverUrl || song.cover || null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useWindowsTaskbar(): void {
  const api = window.electronAPI?.taskbar;

  // Selectors — subscribe only to what we need to avoid unnecessary re-renders
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrevious = usePlayerStore((s) => s.playPrevious);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);

  const isFavoriteSong = useFavoritesStore((s) => s.isFavoriteSong);

  const isLiked = currentSong ? isFavoriteSong(currentSong.id) : false;

  // Track last pushed cover so we don't re-push the same image on every render
  const lastCoverRef = useRef<string | null>(undefined);
  const lastSongIdRef = useRef<string | null>(null);

  // ── 1 & 2 & 3: Window title + thumbnail toolbar + overlay icon ──────────
  useEffect(() => {
    if (!api) return;

    const title = buildTitle(currentSong, isPlaying);
    api.setTitle(title);

    api.setThumbarButtons(isPlaying, isLiked);

    const overlayState: 'playing' | 'paused' | 'stopped' = !currentSong
      ? 'stopped'
      : isPlaying
        ? 'playing'
        : 'paused';
    api.setOverlayIcon(overlayState);
  }, [api, currentSong, isPlaying, isLiked]);

  // ── 4: Thumbnail preview image — only when song changes ─────────────────
  useEffect(() => {
    if (!api) return;
    if (!currentSong) {
      lastCoverRef.current = null;
      lastSongIdRef.current = null;
      api.setThumbnailClip(null);
      return;
    }

    const cover = resolveCoverSource(currentSong as any);

    // Only push to main process when the song (or its cover) changed
    if (currentSong.id !== lastSongIdRef.current || cover !== lastCoverRef.current) {
      lastSongIdRef.current = currentSong.id;
      lastCoverRef.current = cover;
      api.setThumbnailClip(cover);
    }
  }, [api, currentSong]);

  // ── 5: Web Media Session API (hardware keys + Windows media flyout) ──────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!currentSong) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      return;
    }

    const cover = resolveCoverSource(currentSong as any);

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title || 'Unknown Title',
      artist: currentSong.artist || 'Unknown Artist',
      album: (currentSong as any).album || '',
      artwork: cover
        ? [{ src: cover, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [currentSong, isPlaying]);

  // Media Session position state (progress bar in Windows flyout)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!currentSong || !duration) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: duration > 0 ? duration : 0,
        playbackRate: 1,
        position: Math.min(currentTime, duration > 0 ? duration : 0),
      });
    } catch {
      // setPositionState may throw if duration is not yet available
    }
  }, [currentSong, currentTime, duration]);

  // Media Session action handlers (hardware keys → player store)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => {
        setIsPlaying(true);
        window.dispatchEvent(new CustomEvent('player:play'));
      }],
      ['pause', () => {
        setIsPlaying(false);
        window.dispatchEvent(new CustomEvent('player:pause'));
      }],
      ['previoustrack', () => {
        playPrevious();
      }],
      ['nexttrack', () => {
        playNext();
      }],
      ['stop', () => {
        setIsPlaying(false);
        window.dispatchEvent(new CustomEvent('player:pause'));
      }],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers/platforms may not support all actions
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {}
      }
    };
  }, [playNext, playPrevious, setIsPlaying]);

  // ── 6: IPC events from taskbar buttons → player store ───────────────────
  useEffect(() => {
    if (!api) return;

    const unsubPlayPause = api.onPlayPause(() => {
      const playing = usePlayerStore.getState().isPlaying;
      if (playing) {
        usePlayerStore.getState().setIsPlaying(false);
        window.dispatchEvent(new CustomEvent('player:pause'));
      } else {
        usePlayerStore.getState().setIsPlaying(true);
        window.dispatchEvent(new CustomEvent('player:play'));
      }
    });

    const unsubNext = api.onNext(() => {
      usePlayerStore.getState().playNext();
    });

    const unsubPrev = api.onPrev(() => {
      usePlayerStore.getState().playPrevious();
    });

    const unsubStop = api.onStop(() => {
      usePlayerStore.getState().setIsPlaying(false);
      window.dispatchEvent(new CustomEvent('player:pause'));
    });

    const unsubLike = api.onLike(() => {
      const song = usePlayerStore.getState().currentSong;
      if (song) {
        useFavoritesStore.getState().toggleFavoriteSong(song.id);
      }
    });

    return () => {
      unsubPlayPause();
      unsubNext();
      unsubPrev();
      unsubStop();
      unsubLike();
    };
  }, [api]);
}
