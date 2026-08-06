import type { SyncHistoryItem, PlaylistDiff } from '@/types/streamingPlaylist';

export class PlaylistActivityService {
  /** Create a formatted SyncHistoryItem from a playlist diff */
  public static createHistoryEntry(playlistId: string, diff: PlaylistDiff): SyncHistoryItem {
    const notesArr: string[] = [];
    if (diff.added.length > 0) notesArr.push(`+${diff.added.length} added`);
    if (diff.removed.length > 0) notesArr.push(`-${diff.removed.length} removed`);
    if (diff.metadataChanged) notesArr.push('Metadata updated');
    if (diff.reordered && notesArr.length === 0) notesArr.push('Order updated');

    const notes = notesArr.length > 0 ? notesArr.join(', ') : 'Checked (no changes)';

    return {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      playlistId,
      timestamp: Date.now(),
      addedCount: diff.added.length,
      removedCount: diff.removed.length,
      notes,
    };
  }
}
