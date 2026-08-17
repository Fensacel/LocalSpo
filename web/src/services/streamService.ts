/**
 * Stream Service — resolves a Track to a playable audio URL.
 *
 * ARCHITECTURE NOTE:
 * The browser must NEVER receive private API keys or streaming credentials.
 * This service abstracts the resolver. Currently it supports:
 *   - No built-in resolver (limitation: requires backend proxy)
 *
 * See docs/WEB_STREAMING.md and docs/WEB_LIMITATIONS.md for full explanation.
 *
 * To add real streaming: implement a server-side endpoint at /api/stream?sourceId=...
 * and return a signed audio URL or proxy stream. The frontend calls that endpoint.
 */

import type { Track, PlaybackData } from '../types';

export type StreamResolverResult =
  | { ok: true; data: PlaybackData }
  | { ok: false; error: string };

/**
 * Resolves a track to a playable stream URL.
 * Returns null if no resolver is available — the UI should show an error,
 * NOT fall back to a fake/silent audio source.
 */
export async function resolveStream(track: Track): Promise<StreamResolverResult> {
  // If a backend stream API is configured, use it
  const apiBase = import.meta.env.VITE_STREAM_API_URL;
  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/api/stream?sourceId=${encodeURIComponent(track.sourceId)}&source=${encodeURIComponent(track.source)}`);
      if (!res.ok) {
        return { ok: false, error: `Stream API error: ${res.status}` };
      }
      const json = await res.json() as { streamUrl: string; mimeType?: string; expiresAt?: number };
      if (!json.streamUrl) {
        return { ok: false, error: 'Stream API returned no URL' };
      }
      // Validate it looks like an audio URL
      const u = json.streamUrl;
      if (u === window.location.origin + '/' || !u.startsWith('http')) {
        return { ok: false, error: `Invalid stream URL received: ${u}` };
      }
      return {
        ok: true,
        data: {
          streamUrl: json.streamUrl,
          mimeType: json.mimeType,
          expiresAt: json.expiresAt,
        },
      };
    } catch (err) {
      return { ok: false, error: `Stream API request failed: ${String(err)}` };
    }
  }

  // No resolver available
  return {
    ok: false,
    error: 'No stream resolver configured. See docs/WEB_STREAMING.md for setup instructions.',
  };
}

/**
 * Validates that an audio src is safe to assign to HTMLAudioElement.
 * Returns false for any obviously invalid value.
 */
export function isValidAudioSrc(src: string): boolean {
  if (!src) return false;
  if (src === window.location.origin + '/') return false;
  if (src === window.location.href) return false;
  if (src.startsWith('data:audio/wav;base64,UklGRiQ')) return false; // silent WAV pattern
  if (src.startsWith('data:audio/wav;base64,AAAA')) return false;
  // Must be an http(s) URL or blob URL
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:');
}
