import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, PartyPopper, X, Layout, Heart, Mic2, Music } from 'lucide-react';

// Current app release version
const CURRENT_VERSION = '2.0.5';

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const lastSeen = localStorage.getItem('localspo_last_seen_version');
      if (lastSeen !== CURRENT_VERSION) {
        // Show what's new modal on first launch of this version
        setIsOpen(true);
      }
    } catch { }
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem('localspo_last_seen_version', CURRENT_VERSION);
    } catch { }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleOpenManual = () => setIsOpen(true);
    window.addEventListener('app:showWhatsNew', handleOpenManual);
    return () => window.removeEventListener('app:showWhatsNew', handleOpenManual);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg glass-heavy border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl text-text overflow-hidden"
        >
          {/* Top Decorative Glow */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#0070F3]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-text/40 hover:text-text hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Header Icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0070F3]/20 border border-[#0070F3]/30 flex items-center justify-center text-[#0070F3] shrink-0">
              <PartyPopper size={24} />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#0070F3]/15 border border-[#0070F3]/30 text-[#0070F3] tracking-wide">
                <Sparkles size={11} />
                WHAT'S NEW UI
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                LocalSpo v{CURRENT_VERSION}
              </h2>
            </div>
          </div>

          <p className="text-xs text-text/60 mb-5 leading-relaxed">
            Selamat datang di versi 2.0.5! Rilis ini menghadirkan perombakan desain UI desktop baru yang modern, bersih, dan dinamis:
          </p>

          {/* Feature Highlights List */}
          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="p-2 rounded-lg bg-[#0070F3]/15 text-[#0070F3] shrink-0 mt-0.5">
                <Layout size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Desain Desktop Kumo Dark & Navigation</h4>
                <p className="text-[11px] text-text/50 mt-0.5 leading-snug">
                  Tata letak 3 kolom modern dengan font Inter & JetBrains Mono, ambient glow, bar pencarian Ctrl+L, serta sidebar Docs & Settings yang rapi.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                <Music size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Infinite Autoplay (Multi-Artist Mix)</h4>
                <p className="text-[11px] text-text/50 mt-0.5 leading-snug">
                  Musik terus mengalir tanpa terhenti! Ketika playlist habis, pemutar otomatis mencari & memuat lagu-lagu serupa dari berbagai artis berbeda.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="p-2 rounded-lg bg-pink-500/15 text-pink-400 shrink-0 mt-0.5">
                <Mic2 size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Prioritas Lirik Asli Hangul (Korea) & Real-time Sync</h4>
                <p className="text-[11px] text-text/50 mt-0.5 leading-snug">
                  Lirik K-Pop otomatis mengutamakan bahasa asli Korea (Hangul + Romaja), auto-scroll presisi, serta tombol Reload Lyrics (🔄).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400 shrink-0 mt-0.5">
                <Heart size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Pencarian 50+ Lagu & Context Menu Klik Kanan</h4>
                <p className="text-[11px] text-text/50 mt-0.5 leading-snug">
                  Hasil pencarian diperluas hingga 50 item dan dukungan Klik Kanan pada Search Bar untuk opsi Add to Queue, Playlist, Favorite, & Download.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleClose}
            className="w-full py-3 px-4 bg-[#0070F3] hover:bg-[#1B82FF] text-white font-extrabold text-xs rounded-xl transition-all shadow-glow flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check size={16} />
            <span>Cobalah UI Baru</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
