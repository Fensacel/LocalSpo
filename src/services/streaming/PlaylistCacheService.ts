/**
 * PlaylistCacheService
 * Caches artwork, cover images, lyrics, and metadata to disk.
 * CRITICAL RULE: NEVER cache audio files. Audio always streams live.
 */

export class PlaylistCacheService {
  /** Trigger disk caching for playlist and track artwork */
  public static async cacheArtwork(url: string | null | undefined): Promise<string | null> {
    if (!url || !url.startsWith('http')) return url || null;
    try {
      if (window.electronAPI?.cache?.image) {
        const cachedPath = await window.electronAPI.cache.image(url);
        return cachedPath || url;
      }
    } catch (e) {
      console.warn('[PlaylistCacheService] Artwork cache failed:', e);
    }
    return url;
  }

  /** Batch cache cover artwork for playlist tracks */
  public static async cacheTrackCovers(covers: (string | null | undefined)[]): Promise<void> {
    const valid = covers.filter((c): c is string => !!c && c.startsWith('http')).slice(0, 20);
    await Promise.all(valid.map((url) => this.cacheArtwork(url)));
  }
}
