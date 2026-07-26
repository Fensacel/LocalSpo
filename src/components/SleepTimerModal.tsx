import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Music, Clock, X, Minus, Plus } from 'lucide-react';
import { usePlayerStore } from '@/stores';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  align?: 'bottom-player' | 'top-bar' | 'center';
}

export function SleepTimerModal({ isOpen, onClose, align = 'bottom-player' }: SleepTimerModalProps) {
  const {
    sleepTimerOption,
    sleepTimerEndsAt,
    sleepTimerRemainingSongs,
    setSleepTimer,
    startSongsSleepTimer,
    startMinutesSleepTimer,
    clearSleepTimer,
  } = usePlayerStore();

  const [songCount, setSongCount] = useState<number>(10);
  const [minuteCount, setMinuteCount] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<'songs' | 'minutes'>('songs');
  const [remainingText, setRemainingText] = useState<string>('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const isTimerActive =
    sleepTimerOption !== 'off' ||
    sleepTimerEndsAt !== null ||
    sleepTimerRemainingSongs !== null;

  // Handle click outside to close popover
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Track active countdown text
  useEffect(() => {
    if (!isOpen) return;

    const updateRemaining = () => {
      if (sleepTimerRemainingSongs !== null && sleepTimerRemainingSongs > 0) {
        setRemainingText(`${sleepTimerRemainingSongs} lagu tersisa`);
        return;
      }
      if (sleepTimerOption === 'end_of_playlist') {
        setRemainingText('Akhir playlist');
        return;
      }
      if (sleepTimerOption === 'end_of_song') {
        setRemainingText('Akhir lagu ini');
        return;
      }
      if (sleepTimerEndsAt) {
        const diffMs = sleepTimerEndsAt - Date.now();
        if (diffMs <= 0) {
          setRemainingText('Timer selesai');
        } else {
          const totalSec = Math.ceil(diffMs / 1000);
          const mins = Math.floor(totalSec / 60);
          const secs = totalSec % 60;
          setRemainingText(`${mins}m ${secs < 10 ? '0' : ''}${secs}s tersisa`);
        }
        return;
      }
      setRemainingText('');
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [isOpen, sleepTimerOption, sleepTimerEndsAt, sleepTimerRemainingSongs]);

  if (!isOpen) return null;

  const handleStartSongsTimer = () => {
    startSongsSleepTimer(songCount);
    onClose();
  };

  const handleStartMinutesTimer = () => {
    startMinutesSleepTimer(minuteCount);
    onClose();
  };

  const handleStopTimer = () => {
    clearSleepTimer();
    onClose();
  };

  // Positioning classes based on align prop
  const positionClass =
    align === 'bottom-player'
      ? 'absolute bottom-12 right-0 mb-3 z-[110]'
      : align === 'top-bar'
      ? 'absolute top-10 right-0 mt-2 z-[110]'
      : 'fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm';

  const cardContent = (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, scale: 0.9, y: align === 'bottom-player' ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: align === 'bottom-player' ? 10 : -10 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="relative w-[285px] bg-[#18181c]/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-text select-none overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-full text-center pr-4">
          <div className="inline-flex items-center justify-center gap-1 text-white">
            <span className="text-base font-extrabold tracking-tight">Sleep Timer</span>
            <span className="text-[10px] font-bold text-primary/80 -mt-1.5">zzz</span>
          </div>
          {isTimerActive ? (
            <div className="mt-1 inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-[11px] font-bold animate-pulse">
              <Timer size={11} />
              <span>{remainingText || 'Timer Aktif'}</span>
            </div>
          ) : (
            <p className="text-[10px] text-text/50 mt-0.5">Atur penghentian pemutaran otomatis</p>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-text/40 hover:text-text hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Steppers */}
      <div className="space-y-2.5">
        {/* 🎵 Song Count Stepper Row */}
        <div
          onClick={() => setActiveTab('songs')}
          className={`p-2.5 rounded-xl border transition-all ${
            activeTab === 'songs'
              ? 'bg-white/[0.07] border-primary/50 shadow-glow'
              : 'bg-white/[0.02] border-white/5 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Stepper Input */}
            <div className="flex items-center bg-[#101014] rounded-lg border border-white/10 overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSongCount((prev) => Math.max(1, prev - 1));
                  setActiveTab('songs');
                }}
                className="w-7 h-7 flex items-center justify-center text-text/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Minus size={13} />
              </button>

              <input
                type="number"
                min={1}
                max={500}
                value={songCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) setSongCount(val);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('songs');
                }}
                className="w-10 text-center text-xs font-bold bg-transparent text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSongCount((prev) => prev + 1);
                  setActiveTab('songs');
                }}
                className="w-7 h-7 flex items-center justify-center text-text/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Label & Icon */}
            <div className="flex items-center gap-1.5 text-text/80 pr-1">
              <span className="text-[11px] font-semibold">lagu</span>
              <div className="p-1 rounded-md bg-white/5 text-primary">
                <Music size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* ⏱️ Minute Count Stepper Row */}
        <div
          onClick={() => setActiveTab('minutes')}
          className={`p-2.5 rounded-xl border transition-all ${
            activeTab === 'minutes'
              ? 'bg-white/[0.07] border-primary/50 shadow-glow'
              : 'bg-white/[0.02] border-white/5 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Stepper Input */}
            <div className="flex items-center bg-[#101014] rounded-lg border border-white/10 overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMinuteCount((prev) => Math.max(1, prev - 5));
                  setActiveTab('minutes');
                }}
                className="w-7 h-7 flex items-center justify-center text-text/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Minus size={13} />
              </button>

              <input
                type="number"
                min={1}
                max={1440}
                value={minuteCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) setMinuteCount(val);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('minutes');
                }}
                className="w-10 text-center text-xs font-bold bg-transparent text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMinuteCount((prev) => prev + 5);
                  setActiveTab('minutes');
                }}
                className="w-7 h-7 flex items-center justify-center text-text/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Label & Icon */}
            <div className="flex items-center gap-1.5 text-text/80 pr-1">
              <span className="text-[11px] font-semibold">menit</span>
              <div className="p-1 rounded-md bg-white/5 text-sky-400">
                <Clock size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Preset Chips */}
        <div className="pt-0.5 flex flex-wrap gap-1">
          <button
            onClick={() => {
              setSongCount(1);
              setActiveTab('songs');
            }}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
              activeTab === 'songs' && songCount === 1
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-white/5 border-white/10 text-text/50 hover:text-white'
            }`}
          >
            1 Lagu
          </button>
          <button
            onClick={() => {
              setSongCount(10);
              setActiveTab('songs');
            }}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
              activeTab === 'songs' && songCount === 10
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-white/5 border-white/10 text-text/50 hover:text-white'
            }`}
          >
            10 Lagu
          </button>
          <button
            onClick={() => {
              setMinuteCount(15);
              setActiveTab('minutes');
            }}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
              activeTab === 'minutes' && minuteCount === 15
                ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                : 'bg-white/5 border-white/10 text-text/50 hover:text-white'
            }`}
          >
            15m
          </button>
          <button
            onClick={() => {
              setMinuteCount(30);
              setActiveTab('minutes');
            }}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
              activeTab === 'minutes' && minuteCount === 30
                ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                : 'bg-white/5 border-white/10 text-text/50 hover:text-white'
            }`}
          >
            30m
          </button>
          <button
            onClick={() => {
              setSleepTimer('end_of_playlist');
              onClose();
            }}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
              sleepTimerOption === 'end_of_playlist'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-white/5 border-white/10 text-text/50 hover:text-white'
            }`}
          >
            Akhir Playlist
          </button>
        </div>

        {/* Start / Stop Button */}
        <div className="pt-1">
          {isTimerActive ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStopTimer}
              className="w-full py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-extrabold text-xs hover:bg-rose-500/30 transition-all shadow-md"
            >
              Matikan Sleep Timer
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (activeTab === 'songs') {
                  handleStartSongsTimer();
                } else {
                  handleStartMinutesTimer();
                }
              }}
              className="w-full py-2.5 rounded-xl bg-primary text-black font-extrabold text-xs hover:bg-primary-light transition-all shadow-glow"
            >
              Start ({activeTab === 'songs' ? `${songCount} Lagu` : `${minuteCount} Menit`})
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {align === 'center' ? (
        <div className={positionClass}>{cardContent}</div>
      ) : (
        <div className={positionClass}>{cardContent}</div>
      )}
    </AnimatePresence>
  );
}
