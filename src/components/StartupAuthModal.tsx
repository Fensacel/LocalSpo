import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserCheck, Music, Sparkles, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function StartupAuthModal() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('localspo_startup_modal_dismissed') === 'true';
  });

  // Only show if auth finished loading, user is NOT logged in, and modal has not been dismissed yet
  const shouldShow = !loading && !user && !isDismissed;

  const handleDismiss = () => {
    sessionStorage.setItem('localspo_startup_modal_dismissed', 'true');
    setIsDismissed(true);
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      handleDismiss();
    } catch (err) {
      console.error('[StartupAuthModal] Login error:', err);
    }
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          {/* Backdrop click dismisses modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={handleDismiss}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-[#121319] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Lanjut sebagai Guest"
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center space-y-4">
              {/* App Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#121319] rounded-[14px] flex items-center justify-center">
                  <Music className="w-8 h-8 text-blue-400" />
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
                  Selamat Datang di LocalSpo
                  <Sparkles size={18} className="text-amber-400" />
                </h2>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  Nikmati musik tanpa batas! Kamu dapat login untuk menyimpan playlist & history ke akunmu serta mengakses obrolan komunitas.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="w-full bg-white/5 border border-white/5 rounded-xl p-3.5 space-y-2 text-left text-xs text-gray-300">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <span>Mode Guest: Putar musik & local files langsung tanpa login.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <UserCheck size={16} className="text-blue-400 shrink-0" />
                  <span>Mode Akun: Simpan Playlist, History & Chat Komunitas.</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full pt-2 space-y-2.5">
                <button
                  onClick={handleSignIn}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98]"
                >
                  <LogIn size={18} />
                  <span>Login dengan Google</span>
                </button>

                <button
                  onClick={handleDismiss}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-medium text-sm transition-colors"
                >
                  Lanjut sebagai Guest
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
