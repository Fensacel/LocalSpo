/**
 * useDiscordRPC.ts
 *
 * React hook that bridges the LocalSpo player state to Discord Rich Presence.
 *
 * It subscribes to:
 *  - usePlayerStore (currentSong, isPlaying, currentTime, duration, sourceName)
 *  - useSettingsStore (discordRpcEnabled)
 *
 * And calls window.electronAPI.discord.* IPC methods to update/clear presence.
 *
 * Exported:
 *  - useDiscordRPC()        → mounts in App.tsx (side-effect hook)
 *  - useDiscordStatus()     → { connected: boolean } for UI components
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { parseLyrics, findCurrentLyricIndex } from '@/services/lyricsParser';
import type { LyricsData } from '@/types';

// ─── Discord Status Atom ─────────────────────────────────
// A simple module-level signal so multiple components can read status
// without needing React context or a full Zustand store.
let _discordConnected = false;
const _statusListeners = new Set<(connected: boolean) => void>();

function notifyStatusListeners(connected: boolean) {
  _discordConnected = connected;
  _statusListeners.forEach((fn) => fn(connected));
}

/** Lightweight hook to read Discord connection status from any component. */
export function useDiscordStatus(): { connected: boolean } {
  const [connected, setConnected] = useState(_discordConnected);

  useEffect(() => {
    const discordAPI = window.electronAPI?.discord;
    if (discordAPI) {
      discordAPI.getStatus().then(({ connected }: { connected: boolean }) => {
        notifyStatusListeners(connected);
      }).catch(() => {});
    }

    const listener = (c: boolean) => setConnected(c);
    _statusListeners.add(listener);
    return () => {
      _statusListeners.delete(listener);
    };
  }, []);

  return { connected };
}

// ─── Debounce helper ────────────────────────────────────
function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay],
  ) as T;
}

// ─── Main hook ──────────────────────────────────────────

/**
 * Mount this once in App.tsx.
 * Handles all player → Discord Rich Presence synchronization.
 */
export function useDiscordRPC(): void {
  const { currentSong, isPlaying, currentTime, duration, sourceName } = usePlayerStore();
  const { discordRpcEnabled } = useSettingsStore();

  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const discordAPI = window.electronAPI?.discord;
  const prevEnabledRef = useRef(discordRpcEnabled);
  const prevLyricIndexRef = useRef<number>(-1);
  const lastLyricUpdateRef = useRef<number>(0);

  // Load lyrics when song changes
  useEffect(() => {
    if (!currentSong) {
      setLyrics(null);
      prevLyricIndexRef.current = -1;
      return;
    }

    let cancelled = false;
    window.electronAPI?.lyrics?.read(
      currentSong.id,
      currentSong.path,
      currentSong.lrcPath,
      currentSong.hasEmbeddedLyrics,
      currentSong.artist,
      currentSong.title,
      currentSong.album,
    ).then((result: any) => {
      if (cancelled) return;
      if (result && result.content) {
        const parsed = parseLyrics(result.content, currentSong.artist);
        setLyrics(parsed);
      } else {
        setLyrics(null);
      }
    }).catch(() => {
      if (!cancelled) setLyrics(null);
    });

    return () => {
      cancelled = true;
    };
  }, [currentSong?.id]);

  // ── Bootstrap: read initial connection status ──────────
  useEffect(() => {
    if (!discordAPI) return;

    discordAPI.getStatus().then(({ connected }: { connected: boolean }) => {
      notifyStatusListeners(connected);
    }).catch(() => {});

    // Listen for push status-change events from main process
    const cleanup = discordAPI.onStatusChanged(({ connected }: { connected: boolean }) => {
      notifyStatusListeners(connected);
    });

    return cleanup;
  }, [discordAPI]);

  // ── Handle discordRpcEnabled toggle ───────────────────
  useEffect(() => {
    if (!discordAPI) return;

    const wasEnabled = prevEnabledRef.current;
    prevEnabledRef.current = discordRpcEnabled;

    if (wasEnabled !== discordRpcEnabled) {
      discordAPI.setEnabled(discordRpcEnabled).catch(() => {});
    }
  }, [discordRpcEnabled, discordAPI]);

  // ── Build and push presence on playback changes ────────
  const pushPresence = useCallback(async () => {
    if (!discordAPI) return;
    if (!discordRpcEnabled) return;

    if (!currentSong) {
      // No song in queue → clear
      await discordAPI.clearPresence().catch(() => {});
      return;
    }

    let coverUrl: string | undefined = undefined;
    if (currentSong.coverPath && (currentSong.coverPath.startsWith('http://') || currentSong.coverPath.startsWith('https://'))) {
      coverUrl = currentSong.coverPath;
    } else if (currentSong.ytVideoId) {
      coverUrl = `https://i.ytimg.com/vi/${currentSong.ytVideoId}/hqdefault.jpg`;
    }

    let lyricLine: string | undefined = undefined;
    if (lyrics?.synced && lyrics.lines.length > 0) {
      const idx = findCurrentLyricIndex(lyrics.lines, currentTime);
      if (idx >= 0 && lyrics.lines[idx]) {
        lyricLine = lyrics.lines[idx].text;
      }
    }

    await discordAPI.updatePresence({
      title: currentSong.title || 'Unknown Title',
      artist: currentSong.artist || 'Unknown Artist',
      album: currentSong.album || '',
      isPlaying,
      currentTime: Math.max(0, currentTime),
      duration: Math.max(1, currentSong.duration || duration || 180),
      sourceType: currentSong.sourceType ?? 'offline',
      ytVideoId: currentSong.ytVideoId,
      sourceName: sourceName ?? undefined,
      coverUrl,
      lyricLine,
    }).catch(() => {});
  }, [discordAPI, discordRpcEnabled, currentSong, isPlaying, currentTime, duration, sourceName, lyrics]);

  // Debounce rapid song changes (e.g. quick next/prev clicks) by 500 ms
  const debouncedPushPresence = useDebounce(pushPresence, 500);

  // Push on song / playing-state / duration / sourceName / lyrics change
  useEffect(() => {
    debouncedPushPresence();
  }, [currentSong?.id, isPlaying, duration, sourceName, lyrics, debouncedPushPresence]);

  // Push on lyric line change (throttled to 3s per Discord IPC rate limit)
  useEffect(() => {
    if (!lyrics?.synced || !lyrics.lines.length) return;
    const idx = findCurrentLyricIndex(lyrics.lines, currentTime);
    if (idx !== prevLyricIndexRef.current && idx >= 0) {
      prevLyricIndexRef.current = idx;
      const now = Date.now();
      // Only push lyric change if at least 3 seconds passed since last update
      if (now - lastLyricUpdateRef.current >= 3000) {
        lastLyricUpdateRef.current = now;
        debouncedPushPresence();
      }
    }
  }, [currentTime, lyrics, debouncedPushPresence]);

  // Push on seek (currentTime change) — debounced by 800ms to avoid floods
  const debouncedSeekPresence = useDebounce(pushPresence, 800);
  const prevCurrentTimeRef = useRef(currentTime);

  useEffect(() => {
    const delta = Math.abs(currentTime - prevCurrentTimeRef.current);
    // Only treat as a seek if time jumped by more than 2 seconds outside normal playback
    if (delta > 2) {
      debouncedSeekPresence();
    }
    prevCurrentTimeRef.current = currentTime;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime]);
}
