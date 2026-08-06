import type { Song } from './index';

export type StreamingProviderType = 'spotify' | 'ytmusic' | 'apple' | 'deezer';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export type SyncInterval = '5m' | '10m' | '30m' | '1h' | 'manual';

export interface SyncSettings {
  autoSyncEnabled: boolean;
  backgroundSync: boolean;
  syncInterval: SyncInterval;
  notificationsEnabled: boolean;
  keepRemovedSongs: boolean;
  maxCachedSongs: number;
}

export interface PlaylistDiff {
  added: Song[];
  removed: Song[];
  reordered: boolean;
  metadataChanged: boolean;
  updatedAt: number;
}

export interface SyncHistoryItem {
  id: string;
  playlistId: string;
  timestamp: number;
  addedCount: number;
  removedCount: number;
  notes: string;
}

export interface FollowedPlaylist {
  id: string;
  provider: StreamingProviderType;
  playlistUrl: string;
  name: string;
  owner: string;
  description: string;
  coverPath: string | null;
  remoteCoverUrl?: string;
  followerCount?: number;
  trackCount: number;
  lastSyncTime: number;
  syncStatus: SyncStatus;
  autoSyncEnabled: boolean;
  isFollowed: boolean;
  tracks: Song[];
  archivedTracks: Song[];
  syncHistory: SyncHistoryItem[];
}
