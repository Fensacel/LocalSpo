import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Users, Copy, Check, X, LogOut, Plus, Sparkles, Loader2 } from 'lucide-react';
import { useJamStore } from '@/stores/useJamStore';
import { useToastStore } from '@/stores';
import { SafeAvatar } from '@/components/SafeImage';

interface JamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JamModal({ isOpen, onClose }: JamModalProps) {
  const {
    jamCode,
    isHost,
    participants,
    isConnecting,
    createJamSession,
    joinJamSession,
    leaveJamSession,
  } = useJamStore();

  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!jamCode) return;
    navigator.clipboard.writeText(jamCode);
    setCopied(true);
    useToastStore.getState().showToast('Jam Code tersalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartJam = async () => {
    await createJamSession();
  };

  const handleJoinJam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const ok = await joinJamSession(inputCode);
    if (ok) {
      setInputCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-[#121215] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 text-white"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-text/50 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#0070F3]/15 border border-[#0070F3]/30 flex items-center justify-center text-[#0070F3] shrink-0 shadow-glow">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Listening Jam <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#0070F3]/20 text-[#0070F3] border border-[#0070F3]/30">✨ REAL-TIME</span>
              </h2>
              <p className="text-xs text-text/40">Dengarkan lagu bersama teman secara langsung</p>
            </div>
          </div>

          {/* Active Jam Session Banner */}
          {jamCode ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#0070F3]/20 to-purple-500/20 border border-[#0070F3]/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-text/50 tracking-wider">
                    {isHost ? '👑 Host Jam Sesi Anda' : '🎧 Terhubung ke Jam Sesi'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xl font-mono font-extrabold text-white tracking-widest">{jamCode}</span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-xs text-white transition-colors cursor-pointer flex items-center gap-1"
                      title="Salin Kode Jam"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span className="text-[10px] font-mono">{copied ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-white/10 text-xs font-mono">
                  <Users size={12} className="text-[#0070F3]" />
                  <span>{participants.length}</span>
                </div>
              </div>

              {/* Active Participants list */}
              <div>
                <h4 className="text-[10px] uppercase font-bold text-text/40 font-mono tracking-wider mb-2 flex items-center gap-1.5">
                  <Users size={11} /> Pendengar Aktif ({participants.length})
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                  {participants.map((p, i) => (
                    <div
                      key={`${p.id}_${i}`}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/10">
                          <SafeAvatar src={p.avatarUrl} alt={p.displayName} sizeClassName="w-full h-full" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate flex items-center gap-1">
                            {p.displayName}
                            {p.isHost && (
                              <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">👑 Host</span>
                            )}
                          </p>
                          <p className="text-[10px] text-text/40 font-mono truncate">@{p.username}</p>
                        </div>
                      </div>

                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave Jam button */}
              <button
                onClick={leaveJamSession}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-semibold cursor-pointer"
              >
                <LogOut size={14} />
                Keluar dari Sesi Jam
              </button>
            </div>
          ) : (
            /* Create or Join Options */
            <div className="space-y-5">
              {/* Option 1: Start a new session */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#0070F3]/40 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#0070F3]" /> Buat Jam Sesi Baru
                    </h3>
                    <p className="text-[11px] text-text/40">Dapatkan Kode Jam untuk dibagikan ke teman</p>
                  </div>
                </div>

                <button
                  onClick={handleStartJam}
                  disabled={isConnecting}
                  className="w-full py-2.5 rounded-xl bg-[#0070F3] hover:bg-[#1B82FF] text-white font-semibold text-xs transition-all shadow-glow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={14} />
                      Mulai Jam Sesi
                    </>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] font-mono uppercase text-text/30">atau</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Option 2: Join with Code */}
              <form onSubmit={handleJoinJam} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text/60 mb-1">
                    Gabung dengan Kode Jam Teman
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: JAM-8492"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-white/5 border border-white/10 focus:border-[#0070F3] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-text/30 outline-none uppercase tracking-wider"
                    />
                    <button
                      type="submit"
                      disabled={!inputCode.trim() || isConnecting}
                      className="px-4 py-2 bg-white/10 hover:bg-[#0070F3] text-white rounded-xl font-semibold text-xs transition-all disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      {isConnecting ? <Loader2 size={14} className="animate-spin" /> : 'Gabung'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
