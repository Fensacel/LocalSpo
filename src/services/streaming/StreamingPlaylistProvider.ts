import type { StreamingProviderType } from '@/types/streamingPlaylist';

export interface RemotePlaylistData {
  id: string;
  name: string;
  owner: string;
  description: string;
  coverUrl: string | null;
  trackCount: number;
  tracks: any[];
}

export abstract class StreamingPlaylistProvider {
  abstract readonly providerType: StreamingProviderType;

  /** Fetch full metadata & tracks from remote streaming provider */
  abstract fetchPlaylistData(urlOrId: string): Promise<RemotePlaylistData>;

  /** Helper to validate if a URL or ID matches this provider */
  abstract isSupportedUrl(urlOrId: string): boolean;
}
