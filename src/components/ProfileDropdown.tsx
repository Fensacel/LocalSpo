import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ChevronDown,
  Settings,
  Download,
  Heart,
  ListMusic,
  BarChart2,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAuth } from '@/hooks/useAuth';
import { AnimatePresence, motion } from 'framer-motion';
import { SafeAvatar } from '@/components/SafeImage';

export function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const localProfile = useProfileStore((s) => s.profile);
  const { user, profile: cloudProfile, signOut } = useAuth();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const avatarSrc = cloudProfile?.avatar_url || localProfile?.avatarUrl || null;
  const displayName = cloudProfile?.display_name || localProfile?.displayName || 'User';
  const username = cloudProfile?.username || localProfile?.username || 'me';

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    navigate('/login');
  };

  return (
    <div ref={ref} className="relative">
      {/* Avatar trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer group"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
          <SafeAvatar src={avatarSrc} alt="avatar" sizeClassName="w-6 h-6" fallbackIcon={<User size={12} />} />
        </div>
        <span className="text-[11px] font-semibold text-[#9CA3AF] group-hover:text-white transition-colors max-w-[80px] truncate hidden lg:block">
          {displayName}
        </span>
        <ChevronDown
          size={12}
          className={`text-[#9CA3AF] transition-transform duration-200 hidden lg:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-52 bg-[#1A1A1D] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[200]"
          >
            {/* Profile header */}
            <div className="px-3 py-2.5 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                  <SafeAvatar src={avatarSrc} alt="avatar" sizeClassName="w-8 h-8" fallbackIcon={<User size={14} />} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                  <p className="text-[10px] text-[#8B90A0] truncate">@{username}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/profile'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <User size={14} />
                <span>Profile</span>
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/stats'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <BarChart2 size={14} />
                <span>Stats</span>
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/playlists'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <ListMusic size={14} />
                <span>My Playlists</span>
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/favorites'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <Heart size={14} />
                <span>Liked Songs</span>
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/downloads'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>Downloads</span>
              </button>

              <div className="border-t border-white/5 my-1" />

              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <Settings size={14} />
                <span>Settings</span>
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setOpen(false); navigate('/login'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#0070F3] hover:text-white hover:bg-[#0070F3]/20 transition-all cursor-pointer"
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
