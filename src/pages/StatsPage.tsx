/**
 * StatsPage – /stats
 * Clean, minimal listening statistics dashboard.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCw, Play, Music, Disc3, Mic2, Clock } from 'lucide-react';
import { useStatsStore } from '@/stores/useStatsStore';
import { usePlayerStore, useToastStore } from '@/stores';
import { SafeImage, SafeAvatar } from '@/components/SafeImage';

export function StatsPage() {
  const stats = useStatsStore();
  const { setQueue, setIsPlaying } = usePlayerStore();
  const { showToast } = useToastStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    stats.loadStats();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await stats.loadStats();
      await stats.resolveMissingCovers();
      showToast('Stats updated', 'info');
    } catch {
      showToast('Failed to refresh stats', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const topSongs = stats.getTopSongs(10);
  const topArtists = stats.getTopArtists(6);
  const topAlbums = stats.getTopAlbums(6);
  const recent = stats.getRecentlyPlayed(10);
  const totalPlays = stats.plays.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-4xl mx-auto space-y-8 pb-16 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Listening Stats</h1>
          <p className="text-xs text-text/40 mt-0.5">{totalPlays} total plays recorded</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text/60 hover:text-white text-xs font-medium transition-colors border border-white/5 disabled:opacity-50 cursor-pointer"
        >
          <RotateCw size={13} className={isRefreshing ? 'animate-spin text-[#0070F3]' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Quick Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#141416] p-4 rounded-xl border border-white/5">
          <p className="text-xs font-medium text-text/40">Time Listened</p>
          <p className="text-xl font-bold text-white mt-1">{stats.getLifetimeHours()}</p>
        </div>
        <div className="bg-[#141416] p-4 rounded-xl border border-white/5">
          <p className="text-xs font-medium text-text/40">Total Plays</p>
          <p className="text-xl font-bold text-white mt-1">{totalPlays}</p>
        </div>
        <div className="bg-[#141416] p-4 rounded-xl border border-white/5">
          <p className="text-xs font-medium text-text/40">Daily Average</p>
          <p className="text-xl font-bold text-white mt-1">{stats.getAverageDailyHours()}</p>
        </div>
        <div className="bg-[#141416] p-4 rounded-xl border border-white/5">
          <p className="text-xs font-medium text-text/40">Day Streak</p>
          <p className="text-xl font-bold text-white mt-1">{stats.getListeningStreak()} Days</p>
        </div>
      </div>

      {/* Top Tracks */}
      {topSongs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Music size={16} className="text-[#0070F3]" /> Top Tracks
          </h2>

          <div className="bg-[#141416] border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
            {topSongs.map((s: any, idx: number) => (
              <div
                key={`${s.id}_${idx}`}
                onClick={() => {
                  if (s.songObj) {
                    setQueue([s.songObj], 0, 'Top Tracks');
                    setIsPlaying(true);
                  }
                }}
                className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <span className="text-xs font-mono font-bold text-text/30 w-4 text-center shrink-0">
                  {idx + 1}
                </span>

                <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/5 relative">
                  <SafeImage src={s.coverPath} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play size={12} className="text-white fill-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-[#0070F3] transition-colors">
                    {s.title}
                  </p>
                  <p className="text-[11px] text-text/40 truncate mt-0.5">{s.artist}</p>
                </div>

                <span className="text-xs font-mono text-text/40 font-medium shrink-0">
                  {s.count} {s.count === 1 ? 'play' : 'plays'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Artists & Albums Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Artists */}
        {topArtists.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Mic2 size={16} className="text-purple-400" /> Top Artists
            </h2>
            <div className="bg-[#141416] border border-white/5 rounded-xl p-2.5 space-y-1.5">
              {topArtists.map((a: any, idx: number) => (
                <div key={a.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <span className="text-xs font-mono text-text/30 w-4 text-center shrink-0">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
                    <SafeAvatar src={a.coverPath} alt={a.name} sizeClassName="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{a.name}</p>
                    <p className="text-[10px] text-text/40">{a.count} plays</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Albums */}
        {topAlbums.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Disc3 size={16} className="text-amber-400" /> Top Albums
            </h2>
            <div className="bg-[#141416] border border-white/5 rounded-xl p-2.5 space-y-1.5">
              {topAlbums.map((a: any, idx: number) => (
                <div key={a.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <span className="text-xs font-mono text-text/30 w-4 text-center shrink-0">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/5">
                    <SafeImage src={a.coverPath} alt={a.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{a.name}</p>
                    <p className="text-[10px] text-text/40">{a.count} plays</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recently Played */}
      {recent.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock size={16} className="text-emerald-400" /> Recently Played
          </h2>
          <div className="bg-[#141416] border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
            {recent.map((p: any, idx: number) => (
              <div key={`${p.songId}_${idx}`} className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/5">
                    <SafeImage src={p.coverPath} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{p.title}</p>
                    <p className="text-[10px] text-text/40 truncate">{p.artist}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-text/40 shrink-0">
                  {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalPlays === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-text/30 gap-2 bg-[#141416] border border-white/5 rounded-xl">
          <Music size={40} className="opacity-30 text-[#0070F3]" />
          <p className="text-xs font-semibold text-white">No listening data recorded yet</p>
          <p className="text-[11px]">Play songs to record your listening stats</p>
        </div>
      )}
    </motion.div>
  );
}
