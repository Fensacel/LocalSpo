import { useParams, useNavigate } from 'react-router-dom';
import { Play, Shuffle, Trash2, Clock, ArrowLeft } from 'lucide-react';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { formatDuration } from '../lib/utils';

export function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playlist = usePlaylistStore((s) => s.playlists.find((p) => p.id === id));
  const { removeTrack } = usePlaylistStore();
  const { setQueue } = usePlayerStore();

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-white/40">Playlist not found</p>
        <button onClick={() => navigate('/playlists')} className="text-primary-400 text-sm hover:text-primary-300">
          Back to Playlists
        </button>
      </div>
    );
  }

  const totalDuration = playlist.tracks.reduce((sum, t) => sum + t.duration, 0);
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

  const playAll = () => {
    if (playlist.tracks.length > 0) setQueue(playlist.tracks, 0);
  };

  const playShuffle = () => {
    if (playlist.tracks.length === 0) return;
    const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
    setQueue(shuffled, 0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-0">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-end gap-6 mb-6">
          <img
            src={playlist.coverUrl || '/default-cover.png'}
            alt={playlist.title}
            className="w-40 h-40 rounded-2xl object-cover flex-shrink-0 shadow-2xl"
            onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
          />
          <div className="min-w-0 pb-2">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
              {playlist.source === 'spotify' ? 'Spotify Playlist' : 'Playlist'}
            </p>
            <h1 className="text-3xl font-bold text-white mb-2">{playlist.title}</h1>
            {playlist.description && (
              <p className="text-white/50 text-sm mb-3 line-clamp-2">{playlist.description}</p>
            )}
            <p className="text-white/30 text-sm">
              {playlist.tracks.length} tracks
              {totalDuration > 0 && ` · ${totalHours > 0 ? `${totalHours}h ` : ''}${totalMinutes}m`}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={playAll}
            disabled={playlist.tracks.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 rounded-full text-white font-medium text-sm transition-colors"
          >
            <Play size={16} fill="currentColor" />
            Play All
          </button>
          <button
            onClick={playShuffle}
            disabled={playlist.tracks.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-surface-200 hover:bg-surface-300 disabled:opacity-40 border border-border rounded-full text-white/70 hover:text-white text-sm transition-colors"
          >
            <Shuffle size={16} />
            Shuffle
          </button>
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {playlist.tracks.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Clock size={32} className="text-white/10" />
            <p className="text-white/30">No tracks in this playlist</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-border">
              <span className="text-white/30 text-xs w-8 text-right">#</span>
              <span className="text-white/30 text-xs flex-1">TITLE</span>
              <span className="text-white/30 text-xs hidden sm:block flex-1">ALBUM</span>
              <Clock size={12} className="text-white/30 w-10 text-right" />
              <span className="w-8" />
            </div>
            {playlist.tracks.map((track, i) => (
              <div
                key={`${track.id}-${i}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors group border-b border-border last:border-0"
              >
                <span className="text-white/30 text-sm w-8 text-right flex-shrink-0">{i + 1}</span>
                <button
                  onClick={() => setQueue(playlist.tracks, i)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
                  />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium line-clamp-1">{track.title}</p>
                    <p className="text-white/50 text-xs line-clamp-1">{track.artist}</p>
                  </div>
                </button>
                <span className="text-white/40 text-xs hidden sm:block flex-1 line-clamp-1">{track.album}</span>
                <span className="text-white/30 text-xs w-10 text-right">{formatDuration(track.duration)}</span>
                <button
                  onClick={() => removeTrack(playlist.id, track.id)}
                  className="w-8 flex items-center justify-center text-white/0 group-hover:text-white/40 hover:!text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
