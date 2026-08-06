/**
 * useSmartQueue.ts
 *
 * Intelligent queue management:
 * - Auto Radio: fills queue with similar songs when nearing the end
 * - Genre/Mood/BPM matching
 * - Avoids duplicate artists/albums in a row
 * - Smart Recommendation via local library scoring
 *
 * Reads from usePlayerStore and useLibraryStore (or equivalent).
 * All logic runs in the renderer process — no IPC required.
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

// ─── Types ─────────────────────────────────────────────

interface SmartQueueOptions {
  enabled: boolean;
  /** Minimum songs remaining in queue before auto-refill triggers */
  refillThreshold?: number;
  /** Max songs to add per refill */
  refillCount?: number;
  /** Avoid same artist consecutively */
  avoidDuplicateArtist?: boolean;
  /** Avoid same album consecutively */
  avoidDuplicateAlbum?: boolean;
}

// ─── Scoring ───────────────────────────────────────────

type Song = ReturnType<typeof usePlayerStore.getState>['currentSong'];

function scoreSimilarity(
  target: NonNullable<Song>,
  candidate: NonNullable<Song>,
  recentArtists: string[],
  recentAlbums: string[],
  opts: SmartQueueOptions,
): number {
  let score = 0;

  // Genre match (both may have genre arrays or strings)
  const targetGenres: string[] = Array.isArray((target as any).genres)
    ? (target as any).genres
    : (target as any).genre
    ? [(target as any).genre]
    : [];
  const candidateGenres: string[] = Array.isArray((candidate as any).genres)
    ? (candidate as any).genres
    : (candidate as any).genre
    ? [(candidate as any).genre]
    : [];
  const genreOverlap = targetGenres.filter((g) => candidateGenres.includes(g)).length;
  score += genreOverlap * 30;

  // Same artist bonus (but not if avoidDuplicateArtist)
  const sameArtist = candidate.artist === target.artist;
  if (sameArtist) {
    if (opts.avoidDuplicateArtist && recentArtists.includes(candidate.artist || '')) {
      score -= 50; // Heavy penalty
    } else {
      score += 15;
    }
  }

  // Same album penalty when avoiding duplicates
  if (opts.avoidDuplicateAlbum && recentAlbums.includes((candidate as any).album || '')) {
    score -= 30;
  }

  // BPM proximity (if available)
  const targetBpm = (target as any).bpm as number | undefined;
  const candidateBpm = (candidate as any).bpm as number | undefined;
  if (targetBpm && candidateBpm) {
    const diff = Math.abs(targetBpm - candidateBpm);
    score += Math.max(0, 20 - diff / 5);
  }

  // Slight random factor for variety
  score += Math.random() * 10;

  return score;
}

// ─── Hook ─────────────────────────────────────────────

export function useSmartQueue(options: SmartQueueOptions = { enabled: true }): {
  triggerRefill: () => void;
} {
  const opts = {
    refillThreshold: 3,
    refillCount: 5,
    avoidDuplicateArtist: true,
    avoidDuplicateAlbum: false,
    ...options,
  };

  const refillInProgress = useRef(false);

  const triggerRefill = useCallback(() => {
    if (!opts.enabled) return;
    if (refillInProgress.current) return;

    const state = usePlayerStore.getState();
    const { currentSong, queue, library } = state as any;

    // queue and library must exist
    if (!currentSong || !library?.songs?.length) return;

    const remaining = queue?.length ?? 0;
    if (remaining > opts.refillThreshold!) return;

    refillInProgress.current = true;

    try {
      // Collect recent artist/album context from current queue
      const recentArtists: string[] = (queue || [])
        .slice(0, 5)
        .map((s: NonNullable<Song>) => s?.artist || '')
        .filter(Boolean);
      const recentAlbums: string[] = (queue || [])
        .slice(0, 5)
        .map((s: NonNullable<Song>) => (s as any)?.album || '')
        .filter(Boolean);

      const queueIds = new Set<string>([
        currentSong.id,
        ...(queue || []).map((s: NonNullable<Song>) => s.id),
      ]);

      // Score all library songs not already in queue
      const candidates: Array<{ song: NonNullable<Song>; score: number }> = library.songs
        .filter((s: NonNullable<Song>) => !queueIds.has(s.id))
        .map((s: NonNullable<Song>) => ({
          song: s,
          score: scoreSimilarity(currentSong, s, recentArtists, recentAlbums, opts),
        }))
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
        .slice(0, opts.refillCount!);

      if (candidates.length > 0) {
        const addToQueue = (state as any).addToQueue;
        if (typeof addToQueue === 'function') {
          candidates.forEach(({ song }: { song: NonNullable<Song> }) => addToQueue(song));
        }
      }
    } finally {
      refillInProgress.current = false;
    }
  }, [opts]);

  // Auto-refill when queue is running low
  useEffect(() => {
    if (!opts.enabled) return;

    const unsubscribe = usePlayerStore.subscribe((state: any) => {
      const remaining = state.queue?.length ?? 0;
      if (remaining <= opts.refillThreshold!) {
        triggerRefill();
      }
    });

    return unsubscribe;
  }, [opts.enabled, opts.refillThreshold, triggerRefill]);

  return { triggerRefill };
}
