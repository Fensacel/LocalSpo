import { useNavigate } from 'react-router-dom';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Heart,
} from 'lucide-react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useFavoritesStore } from '../stores/useFavoritesStore';
import { useAuth } from '../providers/AuthProvider';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';

export function BottomPlayer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentTrack,
    playerState,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffled,
    repeatMode,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    setRepeatMode,
  } = usePlayerStore();

  const { isLiked, likeTrack, unlikeTrack } = useFavoritesStore();

  if (!currentTrack) {
    return (
      <div className="h-20 bg-surface-100 border-t border-border flex items-center justify-center">
        <p className="text-white/20 text-sm">No track selected</p>
      </div>
    );
  }

  const liked = isLiked(currentTrack.id);
  const isPlaying = playerState === 'playing';
  const isError = playerState === 'error';
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleLike = async () => {
    if (!user || !currentTrack) return;
    if (liked) await unlikeTrack(user.id, currentTrack.id);
    else await likeTrack(user.id, currentTrack);
  };

  const cycleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  return (
    <div className="h-20 bg-surface-100 border-t border-border flex items-center px-4 gap-4 flex-shrink-0">
      {/* Track info */}
      <div
        className="flex items-center gap-3 w-64 flex-shrink-0 cursor-pointer group"
        onClick={() => navigate('/now-playing')}
      >
        <img
          src={currentTrack.coverUrl}
          alt={currentTrack.title}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 group-hover:opacity-80 transition-opacity"
          onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
        />
        <div className="min-w-0">
          <p className="text-white text-sm font-medium line-clamp-1">{currentTrack.title}</p>
          <p className="text-white/50 text-xs line-clamp-1">{currentTrack.artist}</p>
          {isError && <p className="text-red-400 text-xs">Unable to play this track</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleLike(); }}
          className={cn('flex-shrink-0 transition-colors', liked ? 'text-primary-400' : 'text-white/40 hover:text-white')}
        >
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={cn('transition-colors', isShuffled ? 'text-primary-400' : 'text-white/50 hover:text-white')}
          >
            <Shuffle size={16} />
          </button>

          <button onClick={previous} className="text-white/70 hover:text-white transition-colors">
            <SkipBack size={20} />
          </button>

          <button
            onClick={togglePlay}
            disabled={isError}
            className="w-10 h-10 rounded-full bg-white hover:bg-white/90 flex items-center justify-center transition-all disabled:opacity-40"
          >
            {isPlaying
              ? <Pause size={18} className="text-surface" />
              : <Play size={18} className="text-surface ml-0.5" />
            }
          </button>

          <button onClick={next} className="text-white/70 hover:text-white transition-colors">
            <SkipForward size={20} />
          </button>

          <button
            onClick={cycleRepeat}
            className={cn('transition-colors', repeatMode !== 'off' ? 'text-primary-400' : 'text-white/50 hover:text-white')}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 w-full max-w-xl">
          <span className="text-white/40 text-xs w-10 text-right">{formatDuration(currentTime)}</span>
          <div
            className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer group relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              seek(ratio * duration);
            }}
          >
            <div
              className="h-full bg-white group-hover:bg-primary-400 rounded-full transition-colors"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-white/40 text-xs w-10">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 w-36 flex-shrink-0 justify-end">
        <button onClick={toggleMute} className="text-white/50 hover:text-white transition-colors">
          {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-20 accent-primary-500"
        />
      </div>
    </div>
  );
}
