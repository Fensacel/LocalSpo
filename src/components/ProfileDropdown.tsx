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
} from 'lucide-react';
import { useProfileStore } from '@/stores/useProfileStore';
import { AnimatePresence, motion } from 'framer-motion';
import { SafeAvatar } from '@/components/SafeImage';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path?: string;
  divider?: boolean;
  disabled?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: <User size={14} />, label: 'Profile', path: '/profile' },
  { icon: <BarChart2 size={14} />, label: 'Stats', path: '/stats' },
  { icon: <ListMusic size={14} />, label: 'My Playlists', path: '/playlists' },
  { icon: <Heart size={14} />, label: 'Liked Songs', path: '/favorites' },
  { icon: <Download size={14} />, label: 'Downloads', path: '/downloads' },
  { icon: <Settings size={14} />, label: 'Settings', path: '/settings', divider: true },
  { icon: <LogOut size={14} />, label: 'Logout', disabled: true },
];

export function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const profile = useProfileStore((s) => s.profile);

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

  const handleItem = (item: MenuItem) => {
    if (item.disabled || !item.path) return;
    setOpen(false);
    navigate(item.path);
  };

  const avatarSrc = profile?.avatarUrl ?? null;
  const displayName = profile?.displayName || 'User';
  const username = profile?.username || 'me';

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
              {MENU_ITEMS.map((item, i) => (
                <div key={i}>
                  {item.divider && <div className="border-t border-white/5 my-1" />}
                  <button
                    type="button"
                    onClick={() => handleItem(item)}
                    disabled={item.disabled}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all cursor-pointer ${
                      item.disabled
                        ? 'text-[#4B5563] cursor-not-allowed'
                        : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.disabled && (
                      <span className="ml-auto text-[9px] font-mono text-[#4B5563] bg-white/5 px-1.5 py-0.5 rounded">
                        soon
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
