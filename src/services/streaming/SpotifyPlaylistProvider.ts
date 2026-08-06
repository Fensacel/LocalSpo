import { StreamingPlaylistProvider, type RemotePlaylistData } from './StreamingPlaylistProvider';
import type { StreamingProviderType } from '@/types/streamingPlaylist';
import { createStreamSong } from '@/types/music';

export class SpotifyPlaylistProvider extends StreamingPlaylistProvider {
  readonly providerType: StreamingProviderType = 'spotify';

  isSupportedUrl(urlOrId: string): boolean {
    return urlOrId.includes('spotify.com') || urlOrId.startsWith('spotify:') || /^[a-zA-Z0-9]{22}$/.test(urlOrId);
  }

  async fetchPlaylistData(urlOrId: string): Promise<RemotePlaylistData> {
    if (!window.electronAPI?.spotify) {
      throw new Error('Spotify API electron bridge unavailable');
    }

    let targetUrl = urlOrId;
    if (!urlOrId.startsWith('http')) {
      const cleanId = urlOrId.replace('spotify:playlist:', '');
      targetUrl = `https://open.spotify.com/playlist/${cleanId}`;
    }

    let meta: any = null;

    // 1. Try IPC fetchPlaylistMeta
    try {
      if (window.electronAPI.spotify.fetchPlaylistMeta) {
        meta = await window.electronAPI.spotify.fetchPlaylistMeta(targetUrl);
      }
    } catch (e) {
      console.warn('[SpotifyPlaylistProvider] IPC fetchPlaylistMeta error:', e);
    }

    // 2. Fallback to HTML Embed parsing via fetchUrl if fetchPlaylistMeta returned no tracks
    if (!meta || !Array.isArray(meta.tracks) || meta.tracks.length === 0) {
      try {
        const html = await window.electronAPI.spotify.fetchUrl(targetUrl);
        if (html) {
          const match = html.match(/<script id="__NEXT_DATA__"\s+type="application\/json">\s*(.+?)\s*<\/script>/s);
          if (match && match[1]) {
            const embedJson = JSON.parse(match[1]);
            const entity = embedJson?.props?.pageProps?.state?.data?.entity ||
                           embedJson?.props?.pageProps?.state?.entity ||
                           embedJson?.props?.pageProps?.entity ||
                           embedJson?.props?.pageProps;

            if (entity) {
              const playlistTitle = entity.title || entity.name || 'Spotify Playlist';
              const playlistCoverUrl = entity.coverArt?.sources?.[0]?.url || entity.images?.[0]?.url || null;
              const rawTrackList = entity.trackList || entity.tracks?.items || entity.tracks || entity.items || [];

              const extractedTracks = (Array.isArray(rawTrackList) ? rawTrackList : []).map((item: any, idx: number) => {
                const trackObj = item.track || item.item || item;
                const tTitle = trackObj.title || trackObj.name || item.title || item.name || `Track ${idx + 1}`;
                const tSubtitle = item.subtitle || trackObj.subtitle;
                const artistsList = trackObj.artists?.map((a: any) => a.name || a.profile?.name).filter(Boolean) || [];
                const artistStr = artistsList.length > 0 ? artistsList.join(', ') : (tSubtitle || 'Unknown Artist');
                const tId = trackObj.id || (item.uri?.startsWith('spotify:track:') ? item.uri.split(':')[2] : `${urlOrId}_${idx}`);
                const tDur = item.duration || trackObj.durationMs || trackObj.duration_ms || 180000;
                const cover = trackObj.album?.images?.[0]?.url ||
                              trackObj.album?.coverArt?.sources?.[0]?.url ||
                              trackObj.coverArt?.sources?.[0]?.url ||
                              playlistCoverUrl;

                return {
                  id: tId,
                  title: tTitle,
                  artist: artistStr,
                  album: trackObj.album?.name || playlistTitle,
                  coverUrl: cover,
                  durationMs: tDur,
                };
              });

              meta = {
                id: urlOrId,
                title: playlistTitle,
                artist: entity.owner?.display_name || 'Spotify User',
                description: entity.description || '',
                coverUrl: playlistCoverUrl,
                tracks: extractedTracks,
              };
            }
          }
        }
      } catch (fallbackErr) {
        console.warn('[SpotifyPlaylistProvider] Embed fallback error:', fallbackErr);
      }
    }

    if (!meta || !Array.isArray(meta.tracks)) {
      throw new Error('Failed to parse Spotify playlist metadata. Make sure the link is a valid public Spotify playlist.');
    }

    const tracks = meta.tracks.map((t: any, idx: number) => {
      const trackId = t.id || `${meta.id || urlOrId}_${idx}`;
      const song = createStreamSong({
        id: `stream_${trackId}`,
        title: t.title || `Track ${idx + 1}`,
        artist: t.artist || meta.artist || 'Unknown Artist',
        album: (t.album && t.album !== meta.title) ? t.album : (t.album || meta.title || 'Single'),
        duration: t.durationMs ? Math.round(t.durationMs / 1000) : (t.duration ? t.duration : 180),
        coverUrl: t.coverUrl || meta.coverUrl || undefined,
        ytVideoId: t.spotifyId || t.id || '',
      });
      song.track = t.trackNumber || idx + 1;
      return song;
    });

    return {
      id: meta.id || urlOrId,
      name: meta.title || 'Spotify Playlist',
      owner: meta.artist || meta.owner || 'Spotify User',
      description: meta.description || '',
      coverUrl: meta.coverUrl || (tracks[0]?.coverPath || null),
      trackCount: tracks.length,
      tracks,
    };
  }
}
