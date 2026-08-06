import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, PartyPopper, X, Search, Disc3, FileText, Move } from 'lucide-react';

// Current app release version
const CURRENT_VERSION = '2.0.7';

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
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

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
                UPDATE OVERHAUL
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                LocalSpo v{CURRENT_VERSION}
              </h2>
            </div>
          </div>

          <p className="text-xs text-text/60 mb-5 leading-relaxed">
            Selamat datang di versi 2.0.7! Rilis ini menghadirkan perbaikan mesin pencarian, navigasi album online, pembaruan cover art otomatis, serta UI yang lebih bersih:
          </p>

          {/* Feature Highlights List */}
          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="p-2 rounded-lg bg-[#0070F3]/15 text-[#0070F3] shrink-0 mt-0.5">
                <Search size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Live Search Overlay & Auto Stream Matches</h4>
                <p className="text-[11px] text-text/50 mt-0.5 leading-snug">
                  Hasil pencarian langsung muncul secara real-time dari Spotify/YouTube lengkap dengan cover art, nama artis, dan opsi pemutaran instan.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 shrink-0 mt-0.5">
                <Disc3 size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Navigasi & Tracklist Album Online</h4>
                <p className="text-[11px] text-text/50 mt-0.5 leading-snug">
                  Pencarian album online kini langsung memuat daftar lagu lengkap, tahun rilis, durasi total, dan sampul album resmi.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400 shrink-0 mt-0.5">
                <FileText size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Lirik Tersinkron Presisi & Mode Romanisasi</h4>
                <p className="text-[11px] text-text/50 mt-0.5 leading-snug">
                  Tampilan lirik disederhanakan dengan sorotan baris presisi, teks Hangul/Romanisasi, serta dukungan auto-scroll.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                <Move size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Navigasi Multi-Monitor & Stats Refresh</h4>
                <p className="text-[11px] text-text/50 mt-0.5 leading-snug">
                  Memindahkan jendela aplikasi ke layar ke-2 kini lebih lancar, serta penambahan tombol Refresh Data pada dashboard statistik.
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
            <span>Nikmati LocalSpo v2.0.7</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
