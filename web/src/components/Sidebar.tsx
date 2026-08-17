import { NavLink } from 'react-router-dom';
import { Home, Library, Download, ListMusic, Settings } from 'lucide-react';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/library', icon: Library, label: 'Library' },
  { to: '/downloads', icon: Download, label: 'Downloads' },
  { to: '/playlists', icon: ListMusic, label: 'Playlists' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const playlists = usePlaylistStore((s) => s.playlists);

  return (
    <aside className="w-60 flex-shrink-0 bg-surface-100 border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <img src="/logo.png" alt="LocalSpo" className="w-8 h-8" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span className="text-white font-bold text-lg tracking-tight">LocalSpo</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 py-4">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Playlists */}
      {playlists.length > 0 && (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="text-white/30 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Playlists</p>
          {playlists.map((pl) => (
            <NavLink
              key={pl.id}
              to={`/playlists/${pl.id}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive ? 'text-primary-400 bg-primary-600/10' : 'text-white/50 hover:text-white hover:bg-white/5'
                )
              }
            >
              <img
                src={pl.coverUrl || '/default-cover.png'}
                alt={pl.title}
                className="w-8 h-8 rounded object-cover flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
              />
              <span className="line-clamp-1">{pl.title}</span>
            </NavLink>
          ))}
        </div>
      )}
    </aside>
  );
}
