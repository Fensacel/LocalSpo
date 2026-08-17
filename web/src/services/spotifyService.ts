/**
 * Spotify Metadata Service (Web-compatible, no Electron bridge)
 *
 * Uses Spotify Web API to fetch playlist/album metadata.
 * Requires a valid Spotify access token obtained via OAuth.
 * The token is fetched server-side or via PKCE flow — never via client_secret.
 *
 * NOTE: This service fetches METADATA only. It does NOT download or stream audio.
 */

import type { SearchAlbum, SearchArtist, SearchTrack, Playlist, Track } from '../types';

const SPOTIFY_API = 'https://api.spotify.com/v1';

// Token storage (in-memory only, per session)
let spotifyToken: string | null = null;
let tokenExpiry: number = 0;

export function setSpotifyToken(token: string, expiresIn: number) {
  spotifyToken = token;
  tokenExpiry = Date.now() + expiresIn * 1000;
}

function getToken(): string | null {
  if (!spotifyToken || Date.now() > tokenExpiry) return null;
  return spotifyToken;
}

async function spotifyFetch<T>(path: string): Promise<T | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

// ─── Playlist Import ──────────────────────────────────────────────────────────

export interface SpotifyPlaylistImport {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  tracks: Track[];
  sourcePlaylistId: string;
}

export async function importSpotifyPlaylistByUrl(url: string): Promise<SpotifyPlaylistImport | null> {
  const match = url.match(/playlist\/([A-Za-z0-9]+)/);
  if (!match) return null;
  const playlistId = match[1];
  return importSpotifyPlaylistById(playlistId);
}

export async function importSpotifyPlaylistById(playlistId: string): Promise<SpotifyPlaylistImport | null> {
  const data = await spotifyFetch<SpotifyRawPlaylist>(`/playlists/${playlistId}`);
  if (!data) return null;

  const tracks = parseSpotifyTracks(data.tracks.items);

  // Fetch more pages if needed
  let next = data.tracks.next;
  while (next) {
    const token = getToken();
    if (!token) break;
    const res = await fetch(next, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) break;
    const page = await res.json() as SpotifyTracksPage;
    tracks.push(...parseSpotifyTracks(page.items));
    next = page.next;
  }

  return {
    id: data.id,
    title: data.name,
    description: data.description || '',
    coverUrl: data.images?.[0]?.url || '',
    tracks,
    sourcePlaylistId: data.id,
  };
}

// ─── Search ───────────────────────────────────────────────────────────────────

interface SpotifySearchResult {
  tracks: SearchTrack[];
  albums: SearchAlbum[];
  artists: SearchArtist[];
}

export async function searchSpotify(query: string): Promise<SpotifySearchResult> {
  const data = await spotifyFetch<SpotifyRawSearch>(
    `/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=10`
  );

  if (!data) return { tracks: [], albums: [], artists: [] };

  const tracks: SearchTrack[] = (data.tracks?.items || []).map((t) => ({
    id: t.id,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    coverUrl: t.album.images?.[0]?.url || '/default-cover.png',
    duration: Math.round(t.duration_ms / 1000),
    source: 'spotify',
    sourceId: t.id,
  }));

  const albums: SearchAlbum[] = (data.albums?.items || []).map((a) => ({
    id: a.id,
    title: a.name,
    artist: a.artists.map((ar) => ar.name).join(', '),
    coverUrl: a.images?.[0]?.url || '/default-cover.png',
    year: a.release_date ? parseInt(a.release_date.substring(0, 4)) : undefined,
    trackCount: a.total_tracks,
  }));

  const artists: SearchArtist[] = (data.artists?.items || []).map((a) => ({
    id: a.id,
    name: a.name,
    imageUrl: a.images?.[0]?.url,
    followers: a.followers?.total,
  }));

  return { tracks, albums, artists };
}

export async function getAlbumTracks(albumId: string): Promise<{ album: SearchAlbum; tracks: SearchTrack[] } | null> {
  const data = await spotifyFetch<SpotifyRawAlbum>(`/albums/${albumId}`);
  if (!data) return null;

  const album: SearchAlbum = {
    id: data.id,
    title: data.name,
    artist: data.artists.map((a) => a.name).join(', '),
    coverUrl: data.images?.[0]?.url || '/default-cover.png',
    year: data.release_date ? parseInt(data.release_date.substring(0, 4)) : undefined,
    trackCount: data.total_tracks,
  };

  const tracks: SearchTrack[] = (data.tracks?.items || []).map((t) => ({
    id: t.id,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: data.name,
    coverUrl: data.images?.[0]?.url || '/default-cover.png',
    duration: Math.round(t.duration_ms / 1000),
    source: 'spotify',
    sourceId: t.id,
  }));

  return { album, tracks };
}

// ─── Raw Spotify Types ────────────────────────────────────────────────────────

interface SpotifyImage { url: string }
interface SpotifyArtistRef { id: string; name: string }

interface SpotifyRawTrack {
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtistRef[];
  album: { id: string; name: string; images: SpotifyImage[] };
}

interface SpotifyRawPlaylistTrack { track: SpotifyRawTrack | null }

interface SpotifyTracksPage {
  items: SpotifyRawPlaylistTrack[];
  next: string | null;
}

interface SpotifyRawPlaylist {
  id: string;
  name: string;
  description: string;
  images: SpotifyImage[];
  tracks: SpotifyTracksPage;
}

interface SpotifyRawAlbumTrack {
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtistRef[];
}

interface SpotifyRawAlbum {
  id: string;
  name: string;
  artists: SpotifyArtistRef[];
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
  tracks: { items: SpotifyRawAlbumTrack[] };
}

interface SpotifyRawSearchArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  followers?: { total: number };
}

interface SpotifyRawSearchAlbum {
  id: string;
  name: string;
  artists: SpotifyArtistRef[];
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
}

interface SpotifyRawSearch {
  tracks?: { items: SpotifyRawTrack[] };
  albums?: { items: SpotifyRawSearchAlbum[] };
  artists?: { items: SpotifyRawSearchArtist[] };
}

function parseSpotifyTracks(items: SpotifyRawPlaylistTrack[]): Track[] {
  return items
    .filter((item) => item.track !== null)
    .map((item) => {
      const t = item.track!;
      return {
        id: t.id,
        title: t.name,
        artist: t.artists.map((a) => a.name).join(', '),
        album: t.album.name,
        coverUrl: t.album.images?.[0]?.url || '/default-cover.png',
        duration: Math.round(t.duration_ms / 1000),
        source: 'spotify' as const,
        sourceId: t.id,
      };
    });
}

// ─── Playlist as Playlist type ────────────────────────────────────────────────

export function importToPlaylist(imported: SpotifyPlaylistImport, ownerId: string): Omit<Playlist, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> {
  return {
    title: imported.title,
    description: imported.description,
    coverUrl: imported.coverUrl,
    source: 'spotify',
    sourcePlaylistId: imported.sourcePlaylistId,
    playlistType: 'followed',
    tracks: imported.tracks,
  };
}
