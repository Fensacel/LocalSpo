import { useNavigate } from 'react-router-dom';
import { Heart, Play } from 'lucide-react';
import { useFavoritesStore } from '../stores/useFavoritesStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { formatDuration } from '../lib/utils';

export function LibraryPage() {
  const navigate = useNavigate();
  const likedSongs = useFavoritesStore((s) => s.likedSongs);
  const { setQueue } = usePlayerStore();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Library</h1>

      {/* Liked Songs section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Heart size={18} className="text-white" fill="white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Liked Songs</h2>
              <p className="text-white/40 text-sm">{likedSongs.length} songs</p>
            </div>
          </div>
          {likedSongs.length > 0 && (
            <button
              onClick={() => setQueue(likedSongs, 0)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-full text-white text-sm font-medium transition-colors"
            >
              <Play size={14} fill="currentColor" />
              Play All
            </button>
          )}
        </div>

        {likedSongs.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-3">
            <Heart size={32} className="text-white/10" />
            <p className="text-white/30">No liked songs yet</p>
            <button
              onClick={() => navigate('/search')}
              className="text-primary-400 text-sm hover:text-primary-300 transition-colors"
            >
              Search for music
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {likedSongs.map((track, i) => (
              <button
                key={track.id}
                onClick={() => setQueue(likedSongs, i)}
                className="flex items-center gap-4 w-full px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-border last:border-0"
              >
                <span className="text-white/30 text-sm w-6 text-right flex-shrink-0">{i + 1}</span>
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
        )}
      </section>
    </div>
  );
}
