import type { Song } from '@/types';
import type { PlaylistDiff } from '@/types/streamingPlaylist';

export class PlaylistDiffEngine {
  /**
   * Smart diff algorithm.
   * Compares existing track IDs with incoming remote tracks.
   * Computes added, removed, order changes, and metadata changes.
   */
  public static computeDiff(
    currentTracks: Song[],
    incomingTracks: Song[],
    currentMeta: { name: string; coverUrl?: string | null },
    incomingMeta: { name: string; coverUrl?: string | null },
  ): PlaylistDiff {
    const currentMap = new Map<string, Song>();
    for (const t of currentTracks) {
      if (t.id) currentMap.set(t.id, t);
      if (t.ytVideoId) currentMap.set(t.ytVideoId, t);
      if (t.title && t.artist) {
        currentMap.set(`${t.title.toLowerCase().trim()}_${t.artist.toLowerCase().trim()}`, t);
      }
    }

    const incomingMap = new Map<string, Song>();
    for (const t of incomingTracks) {
      if (t.id) incomingMap.set(t.id, t);
      if (t.ytVideoId) incomingMap.set(t.ytVideoId, t);
      if (t.title && t.artist) {
        incomingMap.set(`${t.title.toLowerCase().trim()}_${t.artist.toLowerCase().trim()}`, t);
      }
    }

    const added: Song[] = [];
    const removed: Song[] = [];

    // Detect added tracks (only truly new tracks)
    for (const track of incomingTracks) {
      const matchKey = track.title && track.artist ? `${track.title.toLowerCase().trim()}_${track.artist.toLowerCase().trim()}` : '';
      const exists = currentMap.has(track.id) || (track.ytVideoId && currentMap.has(track.ytVideoId)) || (matchKey && currentMap.has(matchKey));
      if (!exists) {
        added.push(track);
      }
    }

    // Detect removed tracks
    for (const track of currentTracks) {
      const matchKey = track.title && track.artist ? `${track.title.toLowerCase().trim()}_${track.artist.toLowerCase().trim()}` : '';
      const exists = incomingMap.has(track.id) || (track.ytVideoId && incomingMap.has(track.ytVideoId)) || (matchKey && incomingMap.has(matchKey));
      if (!exists) {
        removed.push(track);
      }
    }

    // Detect order changes
    let reordered = false;
    if (currentTracks.length === incomingTracks.length) {
      for (let i = 0; i < currentTracks.length; i++) {
        if (currentTracks[i].id !== incomingTracks[i].id) {
          reordered = true;
          break;
        }
      }
    } else {
      reordered = true;
    }

    // Detect metadata / artwork changes
    const metadataChanged =
      currentMeta.name !== incomingMeta.name ||
      (currentMeta.coverUrl || null) !== (incomingMeta.coverUrl || null);

    return {
      added,
      removed,
      reordered,
      metadataChanged,
      updatedAt: Date.now(),
    };
  }
}
