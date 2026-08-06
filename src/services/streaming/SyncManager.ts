import { SpotifyPlaylistProvider } from './SpotifyPlaylistProvider';
import { YTMusicPlaylistProvider } from './YTMusicPlaylistProvider';
import type { StreamingPlaylistProvider } from './StreamingPlaylistProvider';
import type { FollowedPlaylist, SyncInterval } from '@/types/streamingPlaylist';
import { PlaylistDiffEngine } from './PlaylistDiffEngine';
import { PlaylistActivityService } from './PlaylistActivityService';
import { PlaylistCacheService } from './PlaylistCacheService';
import { useToastStore } from '@/stores';

export class SyncManager {
  private static providers: StreamingPlaylistProvider[] = [
    new SpotifyPlaylistProvider(),
    new YTMusicPlaylistProvider(),
  ];

  private static syncTimer: ReturnType<typeof setInterval> | null = null;
  private static isSyncingAll = false;
  private static readonly MAX_CONCURRENT_JOBS = 3;

  /** Get appropriate provider for a playlist URL or provider type */
  public static getProvider(providerOrUrl: string): StreamingPlaylistProvider {
    const found = this.providers.find(
      (p) => p.providerType === providerOrUrl || p.isSupportedUrl(providerOrUrl),
    );
    return found || this.providers[0]; // fallback to Spotify
  }

  /** Start background interval sync scheduler */
  public static startScheduler(
    interval: SyncInterval,
    getPlaylists: () => FollowedPlaylist[],
    onSyncComplete: (updatedPlaylist: FollowedPlaylist, notificationMsg?: string) => void,
  ) {
    this.stopScheduler();
    if (interval === 'manual') return;

    let ms = 10 * 60 * 1000;
    if (interval === '5m') ms = 5 * 60 * 1000;
    if (interval === '10m') ms = 10 * 60 * 1000;
    if (interval === '30m') ms = 30 * 60 * 1000;
    if (interval === '1h') ms = 60 * 60 * 1000;

    this.syncTimer = setInterval(() => {
      if (navigator.onLine === false) {
        console.warn('[SyncManager] Offline mode detected. Background sync paused.');
        return;
      }
      this.syncAll(getPlaylists(), onSyncComplete);
    }, ms);
  }

  /** Stop background scheduler */
  public static stopScheduler() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /** Sync all auto-sync enabled followed playlists */
  public static async syncAll(
    playlists: FollowedPlaylist[],
    onSyncComplete: (updatedPlaylist: FollowedPlaylist, notificationMsg?: string) => void,
  ) {
    if (this.isSyncingAll || navigator.onLine === false) return;
    this.isSyncingAll = true;

    const queue = playlists.filter((p) => p.isFollowed && p.autoSyncEnabled);
    const worker = async (pl: FollowedPlaylist) => {
      try {
        const updated = await this.syncSinglePlaylist(pl);
        if (updated) {
          const added = updated.lastDiff?.added.length || 0;
          const removed = updated.lastDiff?.removed.length || 0;
          let msg: string | undefined;

          if (added > 0 || removed > 0) {
            msg = `🎵 ${pl.name} updated: +${added} new, -${removed} removed`;
          }
          onSyncComplete(updated.playlist, msg);
        }
      } catch (err) {
        console.error(`[SyncManager] Sync failed for ${pl.name}:`, err);
      }
    };

    // Concurrency limiter (Max 3)
    const executing: Promise<void>[] = [];
    for (const pl of queue) {
      const p = worker(pl);
      executing.push(p);
      if (executing.length >= this.MAX_CONCURRENT_JOBS) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);
    this.isSyncingAll = false;
  }

  /** Sync a single followed playlist with exponential retry and diff engine */
  public static async syncSinglePlaylist(
    playlist: FollowedPlaylist,
    keepRemovedSongs = true,
  ): Promise<{ playlist: FollowedPlaylist; lastDiff?: any } | null> {
    if (navigator.onLine === false) {
      const offlinePl: FollowedPlaylist = {
        ...playlist,
        syncStatus: 'offline',
      };
      useToastStore.getState().showToast?.(`Offline Mode: Could not sync ${playlist.name}`, 'info');
      return { playlist: offlinePl };
    }

    const isRemoteUrl = playlist.playlistUrl && (
      playlist.playlistUrl.includes('spotify.com') ||
      playlist.playlistUrl.includes('youtube.com') ||
      playlist.playlistUrl.includes('youtu.be') ||
      playlist.playlistUrl.startsWith('spotify:') ||
      /^[a-zA-Z0-9]{22}$/.test(playlist.playlistUrl)
    );

    if (!isRemoteUrl) {
      // Local/Custom playlist sync: update lastSyncTime gracefully
      const updatedPlaylist: FollowedPlaylist = {
        ...playlist,
        lastSyncTime: Date.now(),
        syncStatus: 'idle',
      };
      return { playlist: updatedPlaylist };
    }

    const provider = this.getProvider(playlist.provider || playlist.playlistUrl);

    let attempts = 0;
    let remoteData: any = null;
    let lastErr: any = null;

    // Exponential retry (up to 3 attempts)
    while (attempts < 3) {
      try {
        attempts++;
        remoteData = await provider.fetchPlaylistData(playlist.playlistUrl);
        break;
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempts) * 1000));
      }
    }

    if (!remoteData) {
      console.warn(`[SyncManager] Remote sync skipped or failed for ${playlist.name}:`, lastErr?.message || lastErr);
      return {
        playlist: {
          ...playlist,
          lastSyncTime: Date.now(),
          syncStatus: 'idle',
        },
      };
    }

    // Compute diff
    const diff = PlaylistDiffEngine.computeDiff(
      playlist.tracks,
      remoteData.tracks,
      { name: playlist.name, coverUrl: playlist.coverPath },
      { name: remoteData.name, coverUrl: remoteData.coverUrl },
    );

    // Build updated tracklist & archived tracks
    let updatedTracks = [...playlist.tracks];
    let archivedTracks = [...playlist.archivedTracks];

    if (diff.added.length > 0 || diff.removed.length > 0 || diff.reordered) {
      if (keepRemovedSongs && diff.removed.length > 0) {
        // Move removed songs to archivedTracks
        for (const remTrack of diff.removed) {
          if (!archivedTracks.some((a) => a.id === remTrack.id)) {
            archivedTracks.push(remTrack);
          }
        }
      }
      // Replace with remote tracks order
      updatedTracks = remoteData.tracks;
    }

    // Cache cover artwork asynchronously
    PlaylistCacheService.cacheArtwork(remoteData.coverUrl).catch(() => {});

    const historyEntry = PlaylistActivityService.createHistoryEntry(playlist.id, diff);
    const updatedHistory = [historyEntry, ...playlist.syncHistory].slice(0, 50);

    const updatedPlaylist: FollowedPlaylist = {
      ...playlist,
      name: remoteData.name || playlist.name,
      owner: remoteData.owner || playlist.owner,
      description: remoteData.description || playlist.description,
      coverPath: remoteData.coverUrl || playlist.coverPath,
      trackCount: updatedTracks.length,
      tracks: updatedTracks,
      archivedTracks,
      lastSyncTime: Date.now(),
      syncStatus: 'idle',
      syncHistory: updatedHistory,
    };

    return { playlist: updatedPlaylist, lastDiff: diff };
  }
}
