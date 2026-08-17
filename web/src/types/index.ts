// ─── Track & Audio ────────────────────────────────────────────────────────────

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  coverUrl: string;
  duration: number; // seconds
  source: 'spotify' | 'youtube' | 'local' | 'unknown';
  sourceId: string;
  position?: number;
}

export interface PlaybackData {
  streamUrl: string;
  mimeType?: string;
  expiresAt?: number; // unix timestamp ms
}

export type PlayerState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'error';

export type RepeatMode = 'off' | 'one' | 'all';

// ─── Playlist ─────────────────────────────────────────────────────────────────

export interface Playlist {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  coverUrl?: string;
  source?: 'spotify' | 'local' | 'custom';
  sourcePlaylistId?: string;
  playlistType?: 'owned' | 'followed';
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
  followersCount?: number;
  followingCount?: number;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  duration: number;
  source: string;
  sourceId: string;
}

export interface SearchAlbum {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year?: number;
  trackCount?: number;
  tracks?: SearchTrack[];
}

export interface SearchArtist {
  id: string;
  name: string;
  imageUrl?: string;
  followers?: number;
}

export interface SearchResults {
  tracks: SearchTrack[];
  albums: SearchAlbum[];
  artists: SearchArtist[];
  playlists: Playlist[];
  users: Profile[];
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export interface ListeningStats {
  totalPlays: number;
  totalDuration: number; // seconds
  todayDuration: number;
  weekDuration: number;
  monthDuration: number;
  yearDuration: number;
  streak: number;
  topSongs: Array<{ track: Track; playCount: number }>;
  topArtists: Array<{ artist: string; playCount: number; imageUrl?: string }>;
  topAlbums: Array<{ album: string; artist: string; coverUrl?: string; playCount: number }>;
  recentlyPlayed: Array<{ track: Track; playedAt: string }>;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt?: string;
  sender?: Profile;
}

export interface ChatConversation {
  id: string;
  participants: Profile[];
  lastMessage?: ChatMessage;
  updatedAt: string;
}

// ─── Listening Jam ────────────────────────────────────────────────────────────

export interface JamRoom {
  id: string;
  hostId: string;
  host?: Profile;
  participants: Profile[];
  currentTrack?: Track;
  queue: Track[];
  isPlaying: boolean;
  currentTime: number;
  createdAt: string;
}

// ─── Database Row Types ────────────────────────────────────────────────────────

export interface DbProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

export interface DbPlaylist {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  cover_url?: string;
  source?: string;
  source_playlist_id?: string;
  playlist_type?: string;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
}

export interface DbPlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  title: string;
  artist: string;
  album: string;
  album_artist?: string;
  cover_url?: string;
  duration: number;
  position: number;
  source: string;
  source_id: string;
}

export interface DbLikedSong {
  id: string;
  user_id: string;
  track_id: string;
  title: string;
  artist: string;
  album: string;
  cover_url?: string;
  duration: number;
  source: string;
  source_id: string;
  liked_at: string;
}

export interface DbRecentlyPlayed {
  id: string;
  user_id: string;
  track_id: string;
  title: string;
  artist: string;
  album: string;
  cover_url?: string;
  duration: number;
  source: string;
  source_id: string;
  played_at: string;
}
