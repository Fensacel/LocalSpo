import { useNavigate } from 'react-router-dom';
import { Clock, Music, Heart } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useProfileStore } from '../stores/useProfileStore';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { useFavoritesStore } from '../stores/useFavoritesStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { formatDuration } from '../lib/utils';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useProfileStore((s) => s.profile);
  const playlists = usePlaylistStore((s) => s.playlists);
  const likedSongs = useFavoritesStore((s) => s.likedSongs);
  const { setQueue } = usePlayerStore();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const recentPlaylists = playlists.slice(0, 6);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {greeting()}{profile?.displayName ? `, ${profile.displayName}` : ''}
        </h1>
        <p className="text-white/40 text-sm mt-1">What would you like to listen to today?</p>
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <button
          onClick={() => navigate('/library')}
          className="flex items-center gap-4 bg-surface-200 hover:bg-surface-300 border border-border rounded-xl p-4 transition-colors text-left group"
        >
          <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <Music size={22} className="text-primary-400" />
          </div>
          <div>
            <p className="text-white font-medium">Library</p>
            <p className="text-white/40 text-sm">All your music</p>
          </div>
        </button>

        <button
          onClick={() => {
            if (likedSongs.length > 0) setQueue(likedSongs, 0);
            else navigate('/library');
          }}
          className="flex items-center gap-4 bg-surface-200 hover:bg-surface-300 border border-border rounded-xl p-4 transition-colors text-left group"
        >
          <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <Heart size={22} className="text-red-400" />
          </div>
          <div>
            <p className="text-white font-medium">Liked Songs</p>
            <p className="text-white/40 text-sm">{likedSongs.length} songs</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/playlists')}
          className="flex items-center gap-4 bg-surface-200 hover:bg-surface-300 border border-border rounded-xl p-4 transition-colors text-left group"
        >
          <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <Clock size={22} className="text-green-400" />
          </div>
          <div>
            <p className="text-white font-medium">Playlists</p>
            <p className="text-white/40 text-sm">{playlists.length} playlists</p>
          </div>
        </button>
      </div>

      {/* Recent playlists */}
      {recentPlaylists.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Playlists</h2>
            <button onClick={() => navigate('/playlists')} className="text-primary-400 text-sm hover:text-primary-300 transition-colors">
              See all
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentPlaylists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => navigate(`/playlists/${pl.id}`)}
                className="group flex flex-col gap-2 text-left"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-surface-200 border border-border">
                  <img
                    src={pl.coverUrl || '/default-cover.png'}
                    alt={pl.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
                  />
                </div>
                <div>
                  <p className="text-white text-sm font-medium line-clamp-1">{pl.title}</p>
                  <p className="text-white/40 text-xs">{pl.tracks.length} tracks</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Liked songs preview */}
      {likedSongs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Recently Liked</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {likedSongs.slice(0, 5).map((track, i) => (
              <button
                key={track.id}
                onClick={() => setQueue(likedSongs, i)}
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
                  <p className="text-white/50 text-xs line-clamp-1">{track.artist}</p>
                </div>
                <span className="text-white/30 text-xs">{formatDuration(track.duration)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {playlists.length === 0 && likedSongs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Music size={48} className="text-white/10" />
          <p className="text-white/30 text-center">
            No music yet. Search for songs or import a Spotify playlist to get started.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-full text-sm font-medium transition-colors"
          >
            Search Music
          </button>
        </div>
      )}
    </div>
  );
}
