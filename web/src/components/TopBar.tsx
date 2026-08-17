import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Radio, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useProfileStore } from '../stores/useProfileStore';
import { cn } from '../lib/utils';

export function TopBar() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const profile = useProfileStore((s) => s.profile);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="h-14 flex items-center gap-4 px-6 bg-surface-100 border-b border-border flex-shrink-0">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums, playlists, users..."
            className="w-full bg-surface-200 border border-border rounded-full pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/playlists')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          title="Import Playlist"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Import</span>
        </button>

        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          title="Listening Jam"
        >
          <Radio size={16} />
          <span className="hidden sm:inline">Jam</span>
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <img
              src={profile?.avatarUrl || '/default-cover.png'}
              alt={profile?.displayName || 'User'}
              className="w-7 h-7 rounded-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.png'; }}
            />
            <span className="text-sm text-white/80 hidden sm:inline max-w-24 truncate">
              {profile?.displayName || 'User'}
            </span>
            <ChevronDown size={14} className="text-white/40" />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    if (profile?.username) navigate(`/profile/${profile.username}`);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <User size={15} />
                  Profile
                </button>
                <div className="border-t border-border" />
                <button
                  onClick={() => { setShowDropdown(false); signOut(); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
