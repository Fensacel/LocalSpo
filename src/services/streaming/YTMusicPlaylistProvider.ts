import { StreamingPlaylistProvider, type RemotePlaylistData } from './StreamingPlaylistProvider';
import type { StreamingProviderType } from '@/types/streamingPlaylist';
import { createStreamSong } from '@/types/music';

export class YTMusicPlaylistProvider extends StreamingPlaylistProvider {
  readonly providerType: StreamingProviderType = 'ytmusic';

  isSupportedUrl(urlOrId: string): boolean {
    return urlOrId.includes('youtube.com') || urlOrId.includes('music.youtube.com') || urlOrId.startsWith('PL');
  }

  async fetchPlaylistData(urlOrId: string): Promise<RemotePlaylistData> {
    if (!window.electronAPI?.spotify?.search) {
      throw new Error('Streaming API electron bridge unavailable');
    }

    const res = await window.electronAPI.spotify.search(urlOrId, ['playlist']);
    const plMatch = res?.playlists?.[0];

    if (!plMatch) {
      throw new Error('YouTube Music playlist not found');
    }

    const tracks = (res.tracks || []).map((t: any, idx: number) => {
      const trackId = t.ytVideoId || t.id || `${plMatch.id}_${idx}`;
      return createStreamSong({
        id: `stream_${trackId}`,
        title: t.title || t.name || `Track ${idx + 1}`,
        artist: t.artist || 'Unknown Artist',
        album: t.album || plMatch.name || 'Single',
        duration: t.durationMs ? t.durationMs / 1000 : 180,
        coverUrl: t.coverUrl || plMatch.coverUrl || undefined,
        ytVideoId: t.ytVideoId || '',
      });
    });

    return {
      id: plMatch.id || urlOrId,
      name: plMatch.name || 'YouTube Music Playlist',
      owner: plMatch.owner || 'YouTube Creator',
      description: plMatch.description || '',
      coverUrl: plMatch.coverUrl || null,
      trackCount: tracks.length,
      tracks,
    };
  }
}
