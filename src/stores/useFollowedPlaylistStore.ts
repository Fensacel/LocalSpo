import { create } from 'zustand';
import type {
  FollowedPlaylist,
  SyncSettings,
  StreamingProviderType,
} from '@/types/streamingPlaylist';
import { SyncManager } from '@/services/streaming/SyncManager';
import { useToastStore } from '@/stores';

interface FollowedPlaylistState {
  followedPlaylists: FollowedPlaylist[];
  settings: SyncSettings;
  isLoading: boolean;

  loadFollowedPlaylists: () => Promise<void>;
  saveFollowedPlaylists: () => Promise<void>;
  followPlaylist: (data: {
    id: string;
    provider: StreamingProviderType;
    playlistUrl: string;
    name: string;
    owner?: string;
    description?: string;
    coverUrl?: string | null;
    tracks?: any[];
  }) => Promise<FollowedPlaylist>;
  unfollowPlaylist: (id: string) => Promise<void>;
  isPlaylistFollowed: (id: string) => boolean;
  getFollowedPlaylist: (id: string) => FollowedPlaylist | undefined;
  syncPlaylist: (id: string) => Promise<void>;
  syncAll: () => Promise<void>;
  updateSettings: (updates: Partial<SyncSettings>) => Promise<void>;
  clearArchivedTracks: (playlistId: string) => Promise<void>;
}

const DEFAULT_SETTINGS: SyncSettings = {
  autoSyncEnabled: true,
  backgroundSync: true,
  syncInterval: '10m',
  notificationsEnabled: true,
  keepRemovedSongs: true,
  maxCachedSongs: 1000,
};

export const useFollowedPlaylistStore = create<FollowedPlaylistState>((set, get) => ({
  followedPlaylists: [],
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  loadFollowedPlaylists: async () => {
    set({ isLoading: true });
    try {
      const data = await window.electronAPI?.data?.read?.('followed_playlists.json');
      if (data) {
        const followed = Array.isArray(data.followedPlaylists) ? data.followedPlaylists : [];
        const settings = data.settings ? { ...DEFAULT_SETTINGS, ...data.settings } : DEFAULT_SETTINGS;
        set({ followedPlaylists: followed, settings });

        // Start background sync scheduler if enabled
        if (settings.backgroundSync) {
          SyncManager.startScheduler(
            settings.syncInterval,
            () => get().followedPlaylists,
            (updated, notificationMsg) => {
              set((s) => ({
                followedPlaylists: s.followedPlaylists.map((p) => (p.id === updated.id ? updated : p)),
              }));
              get().saveFollowedPlaylists();

              if (notificationMsg && get().settings.notificationsEnabled) {
                useToastStore.getState().showToast?.(notificationMsg, 'info');
              }
            },
          );
        }
      }
    } catch (err) {
      console.error('[FollowedPlaylistStore] Load error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  saveFollowedPlaylists: async () => {
    try {
      const state = get();
      await window.electronAPI?.data?.write?.('followed_playlists.json', {
        followedPlaylists: state.followedPlaylists,
        settings: state.settings,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('[FollowedPlaylistStore] Save error:', err);
    }
  },

  followPlaylist: async (data) => {
    const existing = get().followedPlaylists.find((p) => p.id === data.id);
    if (existing) {
      if (!existing.isFollowed) {
        const updated = { ...existing, isFollowed: true };
        set((s) => ({
          followedPlaylists: s.followedPlaylists.map((p) => (p.id === data.id ? updated : p)),
        }));
        await get().saveFollowedPlaylists();
        useToastStore.getState().showToast?.(`Following "${data.name}"`, 'success');
        return updated;
      }
      return existing;
    }

    // Fetch initial remote data via SyncManager provider
    const provider = SyncManager.getProvider(data.provider || data.playlistUrl || data.id);
    let remoteData: any = null;
    try {
      remoteData = await provider.fetchPlaylistData(data.playlistUrl || data.id);
    } catch {
      remoteData = {
        name: data.name,
        owner: data.owner || 'Unknown',
        description: data.description || '',
        coverUrl: data.coverUrl || null,
        tracks: data.tracks || [],
      };
    }

    const newPlaylist: FollowedPlaylist = {
      id: data.id,
      provider: data.provider,
      playlistUrl: data.playlistUrl || `https://open.spotify.com/playlist/${data.id}`,
      name: remoteData.name || data.name,
      owner: remoteData.owner || data.owner || 'Spotify',
      description: remoteData.description || data.description || '',
      coverPath: remoteData.coverUrl || data.coverUrl || null,
      trackCount: (remoteData.tracks || []).length,
      lastSyncTime: Date.now(),
      syncStatus: 'idle',
      autoSyncEnabled: true,
      isFollowed: true,
      tracks: remoteData.tracks || [],
      archivedTracks: [],
      syncHistory: [
        {
          id: `hist_init_${Date.now()}`,
          playlistId: data.id,
          timestamp: Date.now(),
          addedCount: (remoteData.tracks || []).length,
          removedCount: 0,
          notes: 'Started following playlist',
        },
      ],
    };

    set((s) => ({
      followedPlaylists: [newPlaylist, ...s.followedPlaylists],
    }));
    await get().saveFollowedPlaylists();

    useToastStore.getState().showToast?.(`Following "${newPlaylist.name}" (Live Sync)`, 'success');
    return newPlaylist;
  },

  unfollowPlaylist: async (id) => {
    const pl = get().followedPlaylists.find((p) => p.id === id);
    set((s) => ({
      followedPlaylists: s.followedPlaylists.filter((p) => p.id !== id),
    }));
    await get().saveFollowedPlaylists();
    if (pl) {
      useToastStore.getState().showToast?.(`Unfollowed "${pl.name}"`, 'info');
    }
  },

  isPlaylistFollowed: (id) => {
    const found = get().followedPlaylists.find((p) => p.id === id);
    return !!found && found.isFollowed;
  },

  getFollowedPlaylist: (id) => {
    return get().followedPlaylists.find((p) => p.id === id);
  },

  syncPlaylist: async (id) => {
    const pl = get().followedPlaylists.find((p) => p.id === id);
    if (!pl) return;

    // Set status syncing
    set((s) => ({
      followedPlaylists: s.followedPlaylists.map((p) =>
        p.id === id ? { ...p, syncStatus: 'syncing' } : p,
      ),
    }));

    const result = await SyncManager.syncSinglePlaylist(pl, get().settings.keepRemovedSongs);
    if (result?.playlist) {
      set((s) => ({
        followedPlaylists: s.followedPlaylists.map((p) => (p.id === id ? result.playlist : p)),
      }));
      await get().saveFollowedPlaylists();

      // Register new stream songs and sync with local playlist store
      try {
        const { useLibraryStore, usePlaylistStore } = await import('@/stores');
        const libState = useLibraryStore.getState();
        const plState = usePlaylistStore.getState();

        result.playlist.tracks.forEach((t) => libState.addStreamSong?.(t));

        const targetPl = plState.playlists.find((p) => p.id === id || p.name === result.playlist.name);
        if (targetPl) {
          const trackIds = result.playlist.tracks.map((t) => t.id);
          plState.updatePlaylist(targetPl.id, {
            songIds: trackIds,
            coverPath: result.playlist.coverPath || targetPl.coverPath,
          });
        }
      } catch (err) {
        console.warn('[FollowedPlaylistStore] Playlist store sync error:', err);
      }

      const added = result.lastDiff?.added.length || 0;
      const removed = result.lastDiff?.removed.length || 0;
      if (added > 0 || removed > 0) {
        useToastStore
          .getState()
          .showToast?.(`🎵 "${pl.name}" synced: +${added} new song${added > 1 ? 's' : ''} added to playlist`, 'info');
      } else {
        useToastStore.getState().showToast?.(`"${pl.name}" is up to date`, 'success');
      }
    }
  },

  syncAll: async () => {
    useToastStore.getState().showToast?.('Syncing followed streaming playlists...', 'info');
    await SyncManager.syncAll(get().followedPlaylists, (updated, msg) => {
      set((s) => ({
        followedPlaylists: s.followedPlaylists.map((p) => (p.id === updated.id ? updated : p)),
      }));
      get().saveFollowedPlaylists();
      if (msg && get().settings.notificationsEnabled) {
        useToastStore.getState().showToast?.(msg, 'info');
      }
    });
  },

  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates };
    set({ settings: newSettings });
    await get().saveFollowedPlaylists();

    // Restart scheduler if interval or background sync changed
    if (newSettings.backgroundSync) {
      SyncManager.startScheduler(
        newSettings.syncInterval,
        () => get().followedPlaylists,
        (updated, msg) => {
          set((s) => ({
            followedPlaylists: s.followedPlaylists.map((p) => (p.id === updated.id ? updated : p)),
          }));
          get().saveFollowedPlaylists();
          if (msg && get().settings.notificationsEnabled) {
            useToastStore.getState().showToast?.(msg, 'info');
          }
        },
      );
    } else {
      SyncManager.stopScheduler();
    }
  },

  clearArchivedTracks: async (playlistId) => {
    set((s) => ({
      followedPlaylists: s.followedPlaylists.map((p) =>
        p.id === playlistId ? { ...p, archivedTracks: [] } : p,
      ),
    }));
    await get().saveFollowedPlaylists();
    useToastStore.getState().showToast?.('Cleared archived tracks', 'info');
  },
}));
