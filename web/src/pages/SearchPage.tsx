import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Music, Disc, Mic2, ListMusic, Users, Loader } from 'lucide-react';
import { searchSpotify, getAlbumTracks } from '../services/spotifyService';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useProfileStore } from '../stores/useProfileStore';
import { formatDuration } from '../lib/utils';
import type { SearchTrack, SearchAlbum, SearchArtist } from '../types';
import { supabase } from '../lib/supabase';

interface AlbumModalProps {
  albumId: string;
  onClose: () => void;
}

function AlbumModal({ albumId, onClose }: AlbumModalProps) {
  const [data, setData] = useState<{ album: SearchAlbum; tracks: SearchTrack[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const { setQueue } = usePlayerStore();

  useEffect(() => {
    getAlbumTracks(albumId).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [albumId]);

  const playTrack = (index: number) => {
    if (!data) return;
    // CRITICAL: tracks are SearchTrack objects with correct id/title/artist — NOT the album
    const tracks = data.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      coverUrl: t.coverUrl,
      duration: t.duration,
      source: t.source as 'spotify' | 'local',
      sourceId: t.sourceId,
    }));
    setQueue(tracks, index);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader size={24} className="text-primary-400 animate-spin" />
          </div>
        ) : data ? (
          <>
            <div className="flex items-start gap-5 p-6 border-b border-border">
              <img
                src={data.album.coverUrl}
                alt={data.album.title}
                className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
              />
              <div className="min-w-0">
                <p className="text-white/50 text-xs uppercase tracking-wider">Album</p>
                <h2 className="text-xl font-bold text-white mt-1 line-clamp-2">{data.album.title}</h2>
                <p className="text-white/60 text-sm mt-1">{data.album.artist}</p>
                <p className="text-white/30 text-xs mt-1">{data.album.year} · {data.album.trackCount} tracks</p>
              </div>
            </div>
            <div className="overflow-y-auto">
              {data.tracks.map((track, i) => (
                <button
                  key={track.id}
                  onClick={() => playTrack(i)}
                  className="flex items-center gap-4 w-full px-6 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="text-white/30 text-sm w-6 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium line-clamp-1">{track.title}</p>
                    <p className="text-white/50 text-xs">{track.artist}</p>
                  </div>
                  <span className="text-white/30 text-xs">{formatDuration(track.duration)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-48 text-white/40">Failed to load album</div>
        )}
      </div>
    </div>
  );
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const [query, setQuery] = useState(q);
  const [tracks, setTracks] = useState<SearchTrack[]>([]);
  const [albums, setAlbums] = useState<SearchAlbum[]>([]);
  const [artists, setArtists] = useState<SearchArtist[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string; displayName: string; avatarUrl?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const { setQueue } = usePlayerStore();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    const [spotifyResults, { data: profileResults }] = await Promise.all([
      searchSpotify(q),
      supabase.from('profiles').select('id, username, display_name, avatar_url').ilike('username', `%${q}%`).limit(5),
    ]);
    setTracks(spotifyResults.tracks);
    setAlbums(spotifyResults.albums);
    setArtists(spotifyResults.artists);
    setUsers((profileResults || []).map((p: { id: string; username: string; display_name: string; avatar_url?: string }) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (q) { setQuery(q); doSearch(q); }
  }, [q, doSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const playTrack = (track: SearchTrack, allTracks: SearchTrack[], index: number) => {
    const queue = allTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      coverUrl: t.coverUrl,
      duration: t.duration,
      source: t.source as 'spotify' | 'local',
      sourceId: t.sourceId,
    }));
    setQueue(queue, index);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Search input */}
      <form onSubmit={handleSearch}>
        <div className="relative max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums, playlists, users..."
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </form>

      {loading && (
        <div className="flex items-center gap-3 text-white/40">
          <Loader size={18} className="animate-spin" />
          <span className="text-sm">Searching...</span>
        </div>
      )}

      {!loading && q && (
        <div className="space-y-8">
          {/* Songs */}
          {tracks.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Music size={16} className="text-primary-400" />
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Songs</h2>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {tracks.map((track, i) => (
                  <button
                    key={track.id}
                    onClick={() => playTrack(track, tracks, i)}
                    className="flex items-center gap-4 w-full px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-border last:border-0"
                  >
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium line-clamp-1">{track.title}</p>
                      <p className="text-white/50 text-xs">{track.artist} · {track.album}</p>
                    </div>
                    <span className="text-white/30 text-xs">{formatDuration(track.duration)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {albums.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Disc size={16} className="text-primary-400" />
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Albums</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => setSelectedAlbumId(album.id)}
                    className="flex flex-col gap-2 text-left group"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-surface-200 border border-border">
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
                      />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium line-clamp-1">{album.title}</p>
                      <p className="text-white/40 text-xs line-clamp-1">{album.artist}</p>
                      {album.year && <p className="text-white/25 text-xs">{album.year} · {album.trackCount} tracks</p>}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {artists.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Mic2 size={16} className="text-primary-400" />
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Artists</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {artists.map((artist) => (
                  <div key={artist.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                    {artist.imageUrl ? (
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-surface-200 flex items-center justify-center">
                        <Mic2 size={16} className="text-white/40" />
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{artist.name}</p>
                      {artist.followers && <p className="text-white/40 text-xs">{artist.followers.toLocaleString()} followers</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Users */}
          {users.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-primary-400" />
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Users</h2>
              </div>
              <div className="flex flex-col gap-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => navigate(`/profile/${u.username}`)}
                    className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <img
                      src={u.avatarUrl || '/default-cover.png'}
                      alt={u.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
                    />
                    <div>
                      <p className="text-white text-sm font-medium">{u.displayName}</p>
                      <p className="text-white/40 text-xs">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {tracks.length === 0 && albums.length === 0 && artists.length === 0 && users.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-3">
              <ListMusic size={40} className="text-white/10" />
              <p className="text-white/30">No results for "{q}"</p>
              <p className="text-white/20 text-sm">Make sure Spotify token is configured in settings</p>
            </div>
          )}
        </div>
      )}

      {!q && (
        <div className="flex flex-col items-center py-20 gap-3">
          <Search size={48} className="text-white/10" />
          <p className="text-white/30">Search for songs, artists, albums, and more</p>
        </div>
      )}

      {selectedAlbumId && (
        <AlbumModal albumId={selectedAlbumId} onClose={() => setSelectedAlbumId(null)} />
      )}
    </div>
  );
}
