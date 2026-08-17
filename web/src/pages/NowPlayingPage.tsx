import { useNavigate } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, ArrowLeft, Heart } from 'lucide-react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useFavoritesStore } from '../stores/useFavoritesStore';
import { useAuth } from '../providers/AuthProvider';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';

export function NowPlayingPage() {
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
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-white/40">No track playing</p>
        <button onClick={() => navigate(-1)} className="text-primary-400 text-sm hover:text-primary-300">
          Go back
        </button>
      </div>
    );
  }

  const liked = isLiked(currentTrack.id);
  const isPlaying = playerState === 'playing';
  const isError = playerState === 'error';
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleLike = async () => {
    if (!user) return;
    if (liked) await unlikeTrack(user.id, currentTrack.id);
    else await likeTrack(user.id, currentTrack);
  };

  const cycleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8 gap-8">
      <button
        onClick={() => navigate(-1)}
        className="self-start flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        {/* Cover */}
        <div className="w-72 h-72 rounded-3xl overflow-hidden shadow-2xl">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
          />
        </div>

        {/* Track info */}
        <div className="flex items-center justify-between w-full">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white line-clamp-1">{currentTrack.title}</h1>
            <p className="text-white/50 text-sm mt-0.5 line-clamp-1">{currentTrack.artist}</p>
            <p className="text-white/30 text-xs mt-0.5">{currentTrack.album}</p>
          </div>
          <button
            onClick={handleLike}
            className={cn('flex-shrink-0 ml-4 transition-colors', liked ? 'text-primary-400' : 'text-white/40 hover:text-white')}
          >
            <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Error state */}
        {isError && (
          <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center">
            <p className="text-red-400 text-sm">Unable to play this track</p>
            <p className="text-red-300/50 text-xs mt-1">No stream resolver configured. See docs/WEB_STREAMING.md</p>
          </div>
        )}

        {/* Progress */}
        <div className="w-full space-y-2">
          <div
            className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek(((e.clientX - rect.left) / rect.width) * duration);
            }}
          >
            <div
              className="h-full bg-primary-400 group-hover:bg-primary-300 rounded-full transition-colors"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/30">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 w-full justify-center">
          <button
            onClick={toggleShuffle}
            className={cn('transition-colors', isShuffled ? 'text-primary-400' : 'text-white/50 hover:text-white')}
          >
            <Shuffle size={20} />
          </button>

          <button onClick={previous} className="text-white/70 hover:text-white transition-colors">
            <SkipBack size={24} />
          </button>

          <button
            onClick={togglePlay}
            disabled={isError}
            className="w-14 h-14 rounded-full bg-white hover:bg-white/90 flex items-center justify-center disabled:opacity-40 transition-all shadow-lg"
          >
            {isPlaying
              ? <Pause size={22} className="text-surface" />
              : <Play size={22} className="text-surface ml-1" />
            }
          </button>

          <button onClick={next} className="text-white/70 hover:text-white transition-colors">
            <SkipForward size={24} />
          </button>

          <button
            onClick={cycleRepeat}
            className={cn('transition-colors', repeatMode !== 'off' ? 'text-primary-400' : 'text-white/50 hover:text-white')}
          >
            {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 w-full">
          <button onClick={toggleMute} className="text-white/40 hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 accent-primary-500"
          />
        </div>

        {/* Lyrics placeholder */}
        <div className="w-full bg-card border border-border rounded-2xl p-6 text-center">
          <p className="text-white/20 text-sm">No lyrics available</p>
        </div>
      </div>
    </div>
  );
}
