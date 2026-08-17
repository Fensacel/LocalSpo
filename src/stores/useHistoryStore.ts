import { create } from 'zustand';
import type { Song, HistoryEntry } from '@/types';
import { UserSyncService } from '@/services/userSyncService';

interface HistoryState {
  entries: HistoryEntry[];
  isLoaded: boolean;
  activeUserId: string | null;
  loadHistory: (userId?: string | null) => Promise<void>;
  addHistoryEntry: (song: Song) => Promise<void>;
  clearHistory: () => Promise<void>;
  removeFromHistory: (songId: string) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  isLoaded: false,
  activeUserId: null,

  loadHistory: async (userId?: string | null) => {
    const targetUserId = userId !== undefined ? userId : get().activeUserId;
    set({ activeUserId: targetUserId });

    try {
      const data = await UserSyncService.readData<{ entries: HistoryEntry[] }>(
        targetUserId,
        'history'
      );

      if (data && Array.isArray(data.entries)) {
        set({ entries: data.entries, isLoaded: true });
      } else {
        set({ entries: [], isLoaded: true });
      }
    } catch {
      set({ entries: [], isLoaded: true });
    }
  },

  addHistoryEntry: async (song) => {
    const { entries, activeUserId } = get();
    const now = Date.now();

    // Prevent duplicate entry if the most recent history entry is for the same song within 60 seconds
    if (entries.length > 0) {
      const lastEntry = entries[0];
      if (lastEntry.songId === song.id && now - lastEntry.playedAt < 60000) {
        return;
      }
    }

    // Create new entry
    const newEntry: HistoryEntry = {
      songId: song.id,
      playedAt: now,
      duration: song.duration,
      songData: song,
    };

    const updatedEntries = [newEntry, ...entries].slice(0, 1000);
    set({ entries: updatedEntries });
    await UserSyncService.writeData(activeUserId, 'history', { entries: updatedEntries });
  },

  clearHistory: async () => {
    const { activeUserId } = get();
    set({ entries: [] });
    await UserSyncService.writeData(activeUserId, 'history', { entries: [] });
  },

  removeFromHistory: async (songId: string) => {
    const { entries, activeUserId } = get();
    const updatedEntries = entries.filter((e) => e.songId !== songId);
    set({ entries: updatedEntries });
    await UserSyncService.writeData(activeUserId, 'history', { entries: updatedEntries });
  },
}));

